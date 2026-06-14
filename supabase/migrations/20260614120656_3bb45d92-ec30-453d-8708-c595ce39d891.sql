-- Ensure no direct write privileges for app roles on user_roles
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
GRANT ALL ON public.user_roles TO service_role;

-- Belt-and-suspenders: explicit restrictive-style policies so even if grants change,
-- only admins can manage roles via the Data API. Service role bypasses RLS.
DROP POLICY IF EXISTS "admins insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins delete user_roles" ON public.user_roles;

CREATE POLICY "admins insert user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));