-- Lock down user_roles to prevent privilege escalation.
-- Revoke write privileges from anon/authenticated; only service_role and admins (via SECURITY DEFINER paths) may write.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated, PUBLIC;

-- Keep SELECT for authenticated (needed for "Users view own roles" policy).
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Add a RESTRICTIVE policy to defense-in-depth block any non-admin write attempts even if grants are restored.
DROP POLICY IF EXISTS "Block non-admin writes on user_roles" ON public.user_roles;
CREATE POLICY "Block non-admin writes on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
