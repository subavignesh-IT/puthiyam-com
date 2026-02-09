-- Create table for pre-booked/requested products (for out of stock items)
CREATE TABLE public.requested_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_quantity NUMERIC,
  variant_price NUMERIC,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.requested_products ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.requested_products
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create requests"
ON public.requested_products
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own requests
CREATE POLICY "Users can delete their own requests"
ON public.requested_products
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.requested_products
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all requests
CREATE POLICY "Admins can update all requests"
ON public.requested_products
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete all requests
CREATE POLICY "Admins can delete all requests"
ON public.requested_products
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));