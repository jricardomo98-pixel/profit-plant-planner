DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      plan IS NOT DISTINCT FROM (SELECT plan FROM public.profiles WHERE id = auth.uid())
      AND status IS NOT DISTINCT FROM (SELECT status FROM public.profiles WHERE id = auth.uid())
      AND trial_ends_at IS NOT DISTINCT FROM (SELECT trial_ends_at FROM public.profiles WHERE id = auth.uid())
    )
  )
);