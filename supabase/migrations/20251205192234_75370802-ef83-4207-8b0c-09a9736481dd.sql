-- Tabela de Smart Forms (configurações de formulários)
CREATE TABLE public.smart_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  welcome_message TEXT DEFAULT 'Olá! Preencha o formulário abaixo:',
  success_message TEXT DEFAULT 'Obrigado! Sua solicitação foi registrada.',
  whatsapp_confirmation BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de submissões de Smart Forms
CREATE TABLE public.smart_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  form_id UUID REFERENCES public.smart_forms(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  unique_token TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  name TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'aguardando_contato',
  notes TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar business_hours aos departamentos
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"enabled": false, "start": "08:00", "end": "18:00", "days": [1,2,3,4,5], "timezone": "America/Sao_Paulo"}';

-- Adicionar color aos departamentos
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- RLS para smart_forms
ALTER TABLE public.smart_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own smart_forms" ON public.smart_forms 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own smart_forms" ON public.smart_forms 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own smart_forms" ON public.smart_forms 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own smart_forms" ON public.smart_forms 
FOR DELETE USING (auth.uid() = user_id);

-- RLS para smart_form_submissions
ALTER TABLE public.smart_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions" ON public.smart_form_submissions 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own submissions" ON public.smart_form_submissions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions" ON public.smart_form_submissions 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own submissions" ON public.smart_form_submissions 
FOR DELETE USING (auth.uid() = user_id);

-- Service role access
CREATE POLICY "service_role_full_access_smart_forms" ON public.smart_forms 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_submissions" ON public.smart_form_submissions 
FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_smart_forms_updated_at
  BEFORE UPDATE ON public.smart_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_form_submissions_updated_at
  BEFORE UPDATE ON public.smart_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir departamentos padrão (se não existirem)
-- Nota: Isso será feito via código para associar ao user_id correto