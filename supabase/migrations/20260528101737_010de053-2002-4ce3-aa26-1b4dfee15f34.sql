-- Keep has_role from being callable by anonymous users. Authenticated EXECUTE
-- is required for RLS policies; arbitrary user-ID checks are denied inside the function.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
