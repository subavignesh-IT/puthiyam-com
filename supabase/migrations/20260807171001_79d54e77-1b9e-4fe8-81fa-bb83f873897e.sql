CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = true) AS
SELECT id, product_id, user_name, rating, comment, image_url, created_at
FROM public.reviews;

CREATE POLICY "Public can read review content"
ON public.reviews FOR SELECT TO anon, authenticated
USING (true);

REVOKE SELECT ON public.reviews FROM anon;
REVOKE SELECT ON public.reviews FROM authenticated;
GRANT SELECT (id, product_id, user_name, rating, comment, image_url, created_at) ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.reviews_public TO anon, authenticated;