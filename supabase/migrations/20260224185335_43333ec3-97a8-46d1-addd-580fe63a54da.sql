
CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid,
  name text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'Outros',
  variables text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates" ON public.message_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all templates" ON public.message_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
