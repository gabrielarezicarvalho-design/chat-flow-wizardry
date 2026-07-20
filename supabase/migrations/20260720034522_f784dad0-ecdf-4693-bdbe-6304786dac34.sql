GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

DROP POLICY IF EXISTS "Users can view settings from same company" ON public.settings;
DROP POLICY IF EXISTS "Users can manage settings of their company" ON public.settings;
DROP POLICY IF EXISTS "Admins can manage all settings" ON public.settings;

CREATE POLICY "Users can view settings from same company"
ON public.settings
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can create settings for their company"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update settings for their company"
ON public.settings
FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete settings for their company"
ON public.settings
FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage all settings"
ON public.settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));