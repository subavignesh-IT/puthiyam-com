-- Add DELETE policy for orders table so users can delete their own orders
CREATE POLICY "Users can delete their own orders" 
ON public.orders 
FOR DELETE 
USING (auth.uid() = user_id);