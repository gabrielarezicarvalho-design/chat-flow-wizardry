
CREATE POLICY "Assigned agents can update conversations"
ON public.conversations FOR UPDATE
USING (auth.uid() = assigned_to)
WITH CHECK (true);

CREATE POLICY "Assigned agents can view conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = assigned_to);

CREATE POLICY "Company members can view conversations"
ON public.conversations FOR SELECT
USING (
  company_id IS NOT NULL
  AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Company members can update conversations"
ON public.conversations FOR UPDATE
USING (
  company_id IS NOT NULL
  AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (true);
