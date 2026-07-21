
CREATE TABLE public.sales_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  sign_messages BOOLEAN NOT NULL DEFAULT true,
  message_format TEXT NOT NULL DEFAULT '*{nome}*:
{msg}',
  auto_distribute BOOLEAN NOT NULL DEFAULT false,
  lock_conversation BOOLEAN NOT NULL DEFAULT true,
  sla_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_settings TO authenticated;
GRANT ALL ON public.sales_settings TO service_role;

ALTER TABLE public.sales_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sales settings"
  ON public.sales_settings FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can insert sales settings"
  ON public.sales_settings FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can update sales settings"
  ON public.sales_settings FOR UPDATE
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can delete sales settings"
  ON public.sales_settings FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sales_settings_updated_at
  BEFORE UPDATE ON public.sales_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
