-- These SECURITY DEFINER functions are invoked only by their existing trigger
-- and event trigger. Trigger execution does not require API roles to have
-- EXECUTE, so remove all direct API invocation paths while retaining postgres.
revoke execute on function public.create_business_owner_membership()
  from public, anon, authenticated, service_role;

revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;
