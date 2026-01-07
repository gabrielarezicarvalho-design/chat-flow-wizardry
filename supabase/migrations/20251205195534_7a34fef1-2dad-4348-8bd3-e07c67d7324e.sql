-- Tabela para formulários gerados por fluxo
CREATE TABLE public.flow_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID REFERENCES public.connections(id),
  phone TEXT NOT NULL,
  initial_message TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answered BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para respostas dos formulários
CREATE TABLE public.leads_forms_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.flow_forms(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id),
  phone TEXT NOT NULL,
  name TEXT,
  address TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flow_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_forms_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para flow_forms
CREATE POLICY "Users can view own flow_forms" ON public.flow_forms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own flow_forms" ON public.flow_forms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flow_forms" ON public.flow_forms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flow_forms" ON public.flow_forms FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read flow_forms by id" ON public.flow_forms FOR SELECT USING (true);
CREATE POLICY "Anyone can update answered status" ON public.flow_forms FOR UPDATE USING (true);
CREATE POLICY "service_role_full_access_flow_forms" ON public.flow_forms FOR ALL USING (true) WITH CHECK (true);

-- Políticas para leads_forms_responses
CREATE POLICY "Users can view own responses" ON public.leads_forms_responses FOR SELECT USING (EXISTS (SELECT 1 FROM flow_forms WHERE flow_forms.id = leads_forms_responses.form_id AND flow_forms.user_id = auth.uid()));
CREATE POLICY "Anyone can create responses" ON public.leads_forms_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "service_role_full_access_responses" ON public.leads_forms_responses FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_flow_forms_updated_at BEFORE UPDATE ON public.flow_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();