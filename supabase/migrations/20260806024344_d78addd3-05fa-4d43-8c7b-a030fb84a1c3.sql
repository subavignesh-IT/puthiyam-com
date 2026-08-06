ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;
CREATE UNIQUE INDEX IF NOT EXISTS products_seller_barcode_unique ON public.products (seller_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_barcode_idx ON public.products (barcode);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_tracking text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.pos_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid,
  seller_id uuid NOT NULL,
  customer_name text,
  customer_phone text,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_feedback TO authenticated;
GRANT SELECT ON public.pos_feedback TO anon;
GRANT ALL ON public.pos_feedback TO service_role;

ALTER TABLE public.pos_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pos feedback"
  ON public.pos_feedback FOR SELECT
  USING (true);

CREATE POLICY "Sellers can add feedback for their sales"
  ON public.pos_feedback FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can update their feedback"
  ON public.pos_feedback FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can delete their feedback"
  ON public.pos_feedback FOR DELETE TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pos_feedback_updated_at
  BEFORE UPDATE ON public.pos_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.decrement_variant_stock(_variant_id uuid, _qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.product_variants v
  SET stock_quantity = GREATEST(v.stock_quantity - _qty, 0)
  FROM public.products p
  WHERE v.id = _variant_id
    AND p.id = v.product_id
    AND p.unlimited_stock = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, integer) TO authenticated, anon, service_role;