-- Add order_status column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'pending';

-- Create products table to store products in database
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  base_price numeric NOT NULL,
  measurement_unit text NOT NULL DEFAULT 'g', -- g, kg, ml, l, count
  packing_type text DEFAULT 'pouch', -- pouch, bag, box, bottle, etc.
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product_variants table for different sizes/quantities
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product_images table for multiple images
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Products policies - everyone can view active products
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (is_active = true);

-- Sellers (admins) can manage their own products
CREATE POLICY "Sellers can manage their products"
ON public.products FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Product variants - everyone can view
CREATE POLICY "Anyone can view product variants"
ON public.product_variants FOR SELECT
USING (true);

-- Sellers can manage variants
CREATE POLICY "Sellers can manage product variants"
ON public.product_variants FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Product images - everyone can view
CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
USING (true);

-- Sellers can manage images
CREATE POLICY "Sellers can manage product images"
ON public.product_images FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Admin can view ALL orders (not just their own)
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admin can update any order
CREATE POLICY "Admins can update all orders"
ON public.orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Anyone can view product images storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on products
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();