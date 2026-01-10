-- Create a security definer function to get user's company_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view profiles from same company" ON public.profiles;

-- Create a new policy using the security definer function
CREATE POLICY "Users can view profiles from same company" 
ON public.profiles 
FOR SELECT 
USING (
  company_id = public.get_user_company_id(auth.uid())
  OR id = auth.uid()
);

-- Also fix similar policies on other tables that might have the same issue
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
CREATE POLICY "Users can view their company" 
ON public.companies 
FOR SELECT 
USING (id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view connections from same company" ON public.connections;
CREATE POLICY "Users can view connections from same company" 
ON public.connections 
FOR SELECT 
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view departments from same company" ON public.departments;
CREATE POLICY "Users can view departments from same company" 
ON public.departments 
FOR SELECT 
USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view department members" ON public.department_members;
CREATE POLICY "Users can view department members" 
ON public.department_members 
FOR SELECT 
USING (
  department_id IN (
    SELECT id FROM public.departments 
    WHERE company_id = public.get_user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view settings from same company" ON public.settings;
CREATE POLICY "Users can view settings from same company" 
ON public.settings 
FOR SELECT 
USING (company_id = public.get_user_company_id(auth.uid()));