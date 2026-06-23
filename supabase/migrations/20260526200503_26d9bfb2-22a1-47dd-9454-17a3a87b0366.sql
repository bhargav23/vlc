-- Lock down SECURITY DEFINER functions.
-- has_role must remain executable by authenticated users because RLS policies
-- call it, but the function is written to deny checks for arbitrary user IDs.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- handle_new_user_role is a trigger function; no client should call it directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- Remove permissive client-side INSERT policies on orders / order_items.
-- All order creation now goes through a server function using the service role,
-- which recomputes pricing server-side from the products table.
DROP POLICY IF EXISTS "Anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
