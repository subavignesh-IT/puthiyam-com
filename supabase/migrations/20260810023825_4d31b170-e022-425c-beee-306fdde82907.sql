ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS pan_number text;

ALTER TABLE public.seller_requests
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS upi_id text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount_received numeric NOT NULL DEFAULT 0;

ALTER TABLE public.product_batches
  ADD COLUMN IF NOT EXISTS barcode_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.product_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.product_batches(id) ON DELETE SET NULL,
  supplier text,
  invoice_no text,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity integer NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_purchases TO authenticated;
GRANT ALL ON public.product_purchases TO service_role;

ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own purchases"
ON public.product_purchases FOR ALL TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_purchases_updated_at
BEFORE UPDATE ON public.product_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();