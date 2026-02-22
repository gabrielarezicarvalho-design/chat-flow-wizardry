-- Fix: Admins should only manage connections from their own company
DROP POLICY "Admins can manage all connections" ON public.connections;

CREATE POLICY "Admins can manage company connections" 
ON public.connections 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (company_id = get_user_company_id(auth.uid()) OR company_id IS NULL)
);

-- Also update the SELECT policy to include company_id IS NULL for unassigned connections
DROP POLICY "Users can view connections from same company" ON public.connections;

CREATE POLICY "Users can view connections from same company" 
ON public.connections 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));
