
DROP POLICY IF EXISTS "Assigned agents can update conversations" ON public.conversations;
CREATE POLICY "Assigned agents can update conversations" ON public.conversations
FOR UPDATE TO authenticated
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

DROP POLICY IF EXISTS "Company members can update conversations" ON public.conversations;
CREATE POLICY "Company members can update conversations" ON public.conversations
FOR UPDATE TO authenticated
USING (company_id IS NOT NULL AND company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id IS NOT NULL AND company_id = public.get_user_company_id(auth.uid()));
