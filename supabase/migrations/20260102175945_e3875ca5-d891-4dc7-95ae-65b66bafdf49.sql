-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can add members to own departments" ON public.department_members;

-- Create new policy that allows department owners AND admins to add members
CREATE POLICY "Users can add members to own departments" 
ON public.department_members 
FOR INSERT 
WITH CHECK (
  -- Department owner can add members
  EXISTS (
    SELECT 1 FROM departments
    WHERE departments.id = department_members.department_id 
    AND departments.user_id = auth.uid()
  )
  OR
  -- Admins can add members to any department
  has_role(auth.uid(), 'admin')
);

-- Also update the delete policy to include admins
DROP POLICY IF EXISTS "Users can remove members from own departments" ON public.department_members;

CREATE POLICY "Users can remove members from own departments" 
ON public.department_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM departments
    WHERE departments.id = department_members.department_id 
    AND departments.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin')
);