-- Keep has_role from being callable by anonymous users. Authenticated EXECUTE
-- is required because RLS policies call this function, but the function itself
-- only honors checks for the current user unless called with the service role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
