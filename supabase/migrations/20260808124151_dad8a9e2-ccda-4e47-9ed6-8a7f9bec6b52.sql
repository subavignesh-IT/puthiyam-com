-- 1. Stock audit log
CREATE TABLE public.stock_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text,
  variant_label text,
  change_qty integer NOT NULL,
  stock_before integer,
  stock_after integer,
  reason text NOT NULL DEFAULT 'sale',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  sale_channel text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stock_audit_log TO authenticated;
GRANT ALL ON public.stock_audit_log TO service_role;

ALTER TABLE public.stock_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own stock audit" ON public.stock_audit_log
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers insert own stock audit" ON public.stock_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_stock_audit_seller_created ON public.stock_audit_log (seller_id, created_at DESC);
CREATE INDEX idx_stock_audit_product ON public.stock_audit_log (product_id);

ALTER TABLE public.stock_audit_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_audit_log;

-- 2. GST settings per seller
CREATE TABLE public.gst_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL UNIQUE,
  gstin text,
  default_rate numeric NOT NULL DEFAULT 0,
  prices_include_gst boolean NOT NULL DEFAULT true,
  legal_name text,
  place_of_supply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gst_settings TO authenticated;
GRANT ALL ON public.gst_settings TO service_role;

ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own gst settings" ON public.gst_settings
  FOR ALL TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_gst_settings_updated_at
  BEFORE UPDATE ON public.gst_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Product GST fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gst_rate numeric,
  ADD COLUMN IF NOT EXISTS hsn_code text;

-- 4. Variant barcode
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS barcode text;

CREATE INDEX IF NOT EXISTS idx_variants_barcode ON public.product_variants (barcode);

-- 5. Order GST fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS taxable_value numeric,
  ADD COLUMN IF NOT EXISTS gst_rate numeric,
  ADD COLUMN IF NOT EXISTS gst_amount numeric,
  ADD COLUMN IF NOT EXISTS seller_gstin text;

-- 6. Bill deliveries
CREATE TABLE public.bill_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  order_number text,
  customer_phone text,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'pending',
  error text,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bill_deliveries TO authenticated;
GRANT ALL ON public.bill_deliveries TO service_role;

ALTER TABLE public.bill_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own bill deliveries" ON public.bill_deliveries
  FOR ALL TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bill_deliveries_updated_at
  BEFORE UPDATE ON public.bill_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Stock decrement now writes an audit row
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  _variant_id uuid,
  _qty integer,
  _order_id uuid DEFAULT NULL,
  _reason text DEFAULT 'sale',
  _sale_channel text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _before integer;
  _after integer;
  _unlimited boolean;
  _seller uuid;
  _pid uuid;
  _pname text;
  _vlabel text;
  _onum text;
BEGIN
  SELECT v.stock_quantity, p.unlimited_stock, p.seller_id, p.id, p.name, v.quantity::text
    INTO _before, _unlimited, _seller, _pid, _pname, _vlabel
  FROM public.product_variants v
  JOIN public.products p ON p.id = v.product_id
  WHERE v.id = _variant_id;

  IF _pid IS NULL THEN
    RETURN;
  END IF;

  IF _unlimited THEN
    _after := _before;
  ELSE
    _after := GREATEST(COALESCE(_before, 0) - _qty, 0);
    UPDATE public.product_variants SET stock_quantity = _after WHERE id = _variant_id;
  END IF;

  IF _order_id IS NOT NULL THEN
    SELECT order_number INTO _onum FROM public.orders WHERE id = _order_id;
  END IF;

  INSERT INTO public.stock_audit_log (
    seller_id, product_id, variant_id, product_name, variant_label,
    change_qty, stock_before, stock_after, reason, order_id, order_number,
    sale_channel, created_by
  ) VALUES (
    _seller, _pid, _variant_id, _pname, _vlabel,
    -_qty, _before, _after,
    CASE WHEN _unlimited THEN COALESCE(_reason, 'sale') || ' (unlimited stock)' ELSE COALESCE(_reason, 'sale') END,
    _order_id, _onum, _sale_channel, auth.uid()
  );
END;
$function$;