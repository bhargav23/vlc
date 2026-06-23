
-- 1) Drop broad SELECT policy that allowed listing all files in product-images.
-- The bucket remains public, so direct file URLs continue to work.
DROP POLICY IF EXISTS "Product images are public" ON storage.objects;

-- 2) handle_new_user_role is a trigger function; no client should call it directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
