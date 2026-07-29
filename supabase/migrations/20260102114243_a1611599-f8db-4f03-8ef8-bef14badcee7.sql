-- Tabela para armazenar configurações dos parceiros White Label
-- APENAS os dados de configuração ficam no Supabase principal
-- Os dados dos clientes ficam no Supabase do parceiro
CREATE TABLE public.white_label_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  accent_color TEXT DEFAULT '#10B981',
  background_color TEXT DEFAULT '#F8FAFC',
  
  -- Conexão Supabase do parceiro
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_role_key TEXT,
  
  -- Conexão Google Drive
  google_client_id TEXT,
  google_client_secret TEXT,
  google_drive_connected BOOLEAN DEFAULT false,
  
  -- Conexão UAZAPI
  uazapi_base_url TEXT,
  uazapi_admin_token TEXT,
  uazapi_environment TEXT DEFAULT 'TESTE',
  
  -- Status e controle
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.white_label_partners ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admins Next Pro podem gerenciar todos os parceiros
CREATE POLICY "Admins can manage all partners"
ON public.white_label_partners
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Parceiros podem ver e atualizar seus próprios dados
CREATE POLICY "Partners can view own data"
ON public.white_label_partners
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Partners can update own data"
ON public.white_label_partners
FOR UPDATE
USING (created_by = auth.uid());

-- Acesso público para buscar por slug (login)
CREATE POLICY "Public can read by slug"
ON public.white_label_partners
FOR SELECT
USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_white_label_partners_updated_at
BEFORE UPDATE ON public.white_label_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();