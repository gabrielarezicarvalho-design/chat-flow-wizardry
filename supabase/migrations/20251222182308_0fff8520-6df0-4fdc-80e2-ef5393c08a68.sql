-- Drop the old policy that uses 'public' role
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create new policy for authenticated users to view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);