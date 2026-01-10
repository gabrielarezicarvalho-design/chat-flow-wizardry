-- Create smart_forms table
CREATE TABLE public.smart_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  welcome_message TEXT NOT NULL DEFAULT 'Olá! Preencha o formulário abaixo:',
  success_message TEXT NOT NULL DEFAULT 'Obrigado! Sua solicitação foi registrada.',
  whatsapp_confirmation BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create smart_form_submissions table
CREATE TABLE public.smart_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  form_id UUID REFERENCES public.smart_forms(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  unique_token TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pendente',
  notes TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_connections table for assigning connections to users
CREATE TABLE public.user_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, connection_id)
);

-- Enable RLS on all tables
ALTER TABLE public.smart_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for smart_forms
CREATE POLICY "Users can manage own smart forms" 
ON public.smart_forms 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all smart forms" 
ON public.smart_forms 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public read access for smart_forms (for public form view)
CREATE POLICY "Anyone can view active smart forms" 
ON public.smart_forms 
FOR SELECT 
USING (is_active = true);

-- RLS policies for smart_form_submissions
CREATE POLICY "Users can manage own smart form submissions" 
ON public.smart_form_submissions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all smart form submissions" 
ON public.smart_form_submissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anonymous inserts for public form submissions
CREATE POLICY "Anyone can submit to smart forms" 
ON public.smart_form_submissions 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for user_connections
CREATE POLICY "Users can view own connection assignments" 
ON public.user_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user connections" 
ON public.user_connections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_smart_forms_updated_at
BEFORE UPDATE ON public.smart_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_form_submissions_updated_at
BEFORE UPDATE ON public.smart_form_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();