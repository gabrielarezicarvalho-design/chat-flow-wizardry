-- Criar tabela de pacotes/planos
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_users INTEGER DEFAULT 5,
  max_connections INTEGER DEFAULT 2,
  max_conversations_month INTEGER DEFAULT 1000,
  max_flows INTEGER DEFAULT 10,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  plan_id UUID REFERENCES public.subscription_plans(id),
  is_active BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  google_drive_connected BOOLEAN DEFAULT false,
  google_drive_folder_id TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar coluna company_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN company_id UUID REFERENCES public.companies(id),
ADD COLUMN is_company_admin BOOLEAN DEFAULT false;

-- Criar tabela de tokens do Google Drive por empresa (não por usuário)
CREATE TABLE public.company_google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  folder_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id)
);

-- Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_plans (apenas leitura para todos, CRUD para admin)
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Políticas para companies
CREATE POLICY "Admins can manage all companies" ON public.companies
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own company" ON public.companies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = companies.id
  )
);

-- Políticas para company_google_drive_tokens
CREATE POLICY "Admins can manage drive tokens" ON public.company_google_drive_tokens
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Função para atribuir admin ao email específico
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o email é do admin Next Pro
  IF NEW.email = 'admin@nextpro.com.br' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para auto-atribuir admin
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_drive_tokens_updated_at
BEFORE UPDATE ON public.company_google_drive_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir planos iniciais
INSERT INTO public.subscription_plans (name, description, price, max_users, max_connections, max_conversations_month, max_flows, features) VALUES
('Starter', 'Plano inicial para pequenas empresas', 97.00, 2, 1, 500, 5, '["chat", "flows_basic"]'),
('Professional', 'Plano profissional com mais recursos', 197.00, 5, 3, 2000, 20, '["chat", "flows", "ai_agent", "reports"]'),
('Enterprise', 'Plano completo para grandes empresas', 497.00, 20, 10, 10000, 100, '["chat", "flows", "ai_agent", "reports", "api", "priority_support"]');