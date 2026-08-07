ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_price numeric;

-- Rating page: fetch minimal order info by id (no auth required)
CREATE OR REPLACE FUNCTION public.get_order_for_rating(_order_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'order_number', COALESCE(o.order_number, ''),
    'customer_name', o.customer_name,
    'created_at', o.created_at,
    'items', o.items
  )
  FROM public.orders o
  WHERE o.id = _order_id
$$;

GRANT EXECUTE ON FUNCTION public.get_order_for_rating(uuid) TO anon, authenticated;

-- Rating page: submit feedback for an order item
CREATE OR REPLACE FUNCTION public.submit_pos_feedback(
  _order_id uuid,
  _product_id uuid,
  _rating integer,
  _comment text DEFAULT NULL,
  _customer_name text DEFAULT NULL,
  _customer_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller uuid;
BEGIN
  IF _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  SELECT user_id INTO _seller FROM public.orders WHERE id = _order_id;
  IF _seller IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  INSERT INTO public.pos_feedback (order_id, product_id, seller_id, customer_name, customer_phone, rating, comment)
  VALUES (_order_id, _product_id, _seller, _customer_name, _customer_phone, _rating, NULLIF(_comment, ''));
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_pos_feedback(uuid, uuid, integer, text, text, text) TO anon, authenticated;

-- Reviews: stop exposing reviewer account ids publicly
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;

CREATE POLICY "Users can view their own reviews"
ON public.reviews FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = false) AS
SELECT id, product_id, user_name, rating, comment, image_url, created_at
FROM public.reviews;

GRANT SELECT ON public.reviews_public TO anon, authenticated;