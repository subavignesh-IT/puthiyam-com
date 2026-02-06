-- Add discount_type and sale_end_time columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'amount' CHECK (discount_type IN ('amount', 'percentage')),
ADD COLUMN IF NOT EXISTS sale_end_time timestamp with time zone;

-- Create index for sale end time to efficiently query expired sales
CREATE INDEX IF NOT EXISTS idx_products_sale_end_time ON public.products(sale_end_time) WHERE is_on_sale = true;