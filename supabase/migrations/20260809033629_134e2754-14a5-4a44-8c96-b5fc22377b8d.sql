-- 1. Company details on seller requests + profiles
ALTER TABLE public.seller_requests
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS pincode text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS pincode text;

-- 2. Product batches
CREATE TABLE IF NOT EXISTS public.product_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  batch_no text NOT NULL,
  mfd_date date,
  exp_date date,
  quantity integer NOT NULL DEFAULT 0,
  purchase_price numeric,
  barcode text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_batches TO authenticated;
GRANT ALL ON public.product_batches TO service_role;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own batches" ON public.product_batches;
CREATE POLICY "Sellers manage own batches"
ON public.product_batches FOR ALL TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_product_batches_variant ON public.product_batches(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_seller ON public.product_batches(seller_id);

DROP TRIGGER IF EXISTS update_product_batches_updated_at ON public.product_batches;
CREATE TRIGGER update_product_batches_updated_at
BEFORE UPDATE ON public.product_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Bill designs
CREATE TABLE IF NOT EXISTS public.bill_designs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Bill',
  is_default boolean NOT NULL DEFAULT false,
  template text NOT NULL DEFAULT 'classic',
  accent_color text NOT NULL DEFAULT '#111827',
  header_color text NOT NULL DEFAULT '#111827',
  table_header_color text NOT NULL DEFAULT '#f3f4f6',
  totals_color text NOT NULL DEFAULT '#111827',
  font_family text NOT NULL DEFAULT 'Inter',
  font_size integer NOT NULL DEFAULT 12,
  logo_url text,
  business_name text,
  business_phone text,
  business_address text,
  terms text,
  footer_note text,
  upi_id text,
  show_upi_qr boolean NOT NULL DEFAULT true,
  show_loyalty boolean NOT NULL DEFAULT true,
  show_gstin boolean NOT NULL DEFAULT true,
  show_hsn boolean NOT NULL DEFAULT false,
  show_batch boolean NOT NULL DEFAULT false,
  show_mfd_exp boolean NOT NULL DEFAULT false,
  show_delivery boolean NOT NULL DEFAULT true,
  show_signature boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_designs TO authenticated;
GRANT ALL ON public.bill_designs TO service_role;
ALTER TABLE public.bill_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own bill designs" ON public.bill_designs;
CREATE POLICY "Sellers manage own bill designs"
ON public.bill_designs FOR ALL TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_bill_designs_updated_at ON public.bill_designs;
CREATE TRIGGER update_bill_designs_updated_at
BEFORE UPDATE ON public.bill_designs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. FIFO batch consumption
CREATE OR REPLACE FUNCTION public.consume_variant_batches(_variant_id uuid, _qty integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _remaining integer := GREATEST(COALESCE(_qty, 0), 0);
  _take integer;
  _row record;
  _out jsonb := '[]'::jsonb;
BEGIN
  FOR _row IN
    SELECT id, batch_no, quantity, exp_date
    FROM public.product_batches
    WHERE variant_id = _variant_id
      AND quantity > 0
      AND (exp_date IS NULL OR exp_date >= CURRENT_DATE)
    ORDER BY COALESCE(exp_date, '9999-12-31'::date) ASC, created_at ASC
  LOOP
    EXIT WHEN _remaining <= 0;
    _take := LEAST(_row.quantity, _remaining);
    UPDATE public.product_batches
      SET quantity = quantity - _take
      WHERE id = _row.id;
    _remaining := _remaining - _take;
    _out := _out || jsonb_build_object('batch_id', _row.id, 'batch_no', _row.batch_no, 'qty', _take);
  END LOOP;

  RETURN jsonb_build_object('consumed', _out, 'shortfall', _remaining);
END;
$$;

-- 5. Review privacy: hide the reviewer account id from clients
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, product_id, user_name, rating, comment, image_url, created_at)
  ON public.reviews TO anon, authenticated;
GRANT INSERT, DELETE ON public.reviews TO authenticated;