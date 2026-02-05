-- Add stock, sale, and discount fields to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_in_stock boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_on_sale boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- Create categories table for dynamic category management
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create packing_types table for dynamic packing type management
CREATE TABLE IF NOT EXISTS public.packing_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on packing_types
ALTER TABLE public.packing_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view packing types
CREATE POLICY "Anyone can view packing types" ON public.packing_types
  FOR SELECT USING (true);

-- Admins can manage packing types
CREATE POLICY "Admins can manage packing types" ON public.packing_types
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default categories
INSERT INTO public.categories (name) VALUES 
  ('Hair Care'),
  ('Skin Care'),
  ('Face Care'),
  ('Body Care'),
  ('Health'),
  ('Wellness'),
  ('Essential Oils'),
  ('Herbal Products'),
  ('Groceries'),
  ('Spices'),
  ('Snacks'),
  ('Beverages'),
  ('Personal Care'),
  ('Home Essentials')
ON CONFLICT (name) DO NOTHING;

-- Insert default packing types
INSERT INTO public.packing_types (name) VALUES 
  ('pouch'),
  ('bag'),
  ('box'),
  ('bottle'),
  ('jar'),
  ('tube'),
  ('sachet'),
  ('container'),
  ('packet'),
  ('can'),
  ('wrapper')
ON CONFLICT (name) DO NOTHING;

-- Add stock quantity to product_variants for inventory management
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 100;

-- Add policy for admins to delete orders
CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));