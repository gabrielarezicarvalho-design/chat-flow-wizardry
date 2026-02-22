
-- Tabela de conexões WhatsApp por empresa
CREATE TABLE public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta', 'qr')),
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  -- Meta Cloud API fields
  meta_phone_number_id text,
  meta_waba_id text,
  meta_access_token text,
  meta_verify_token text,
  -- QR (Z-API/UAzapi) fields
  qr_api_url text,
  qr_instance_id text,
  qr_api_token text,
  -- Metadata
  last_error text,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Apenas uma conexão ativa por empresa
CREATE UNIQUE INDEX uq_whatsapp_connections_company ON public.whatsapp_connections(company_id);

-- Tabela de mensagens WhatsApp
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('meta', 'qr')),
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  wa_message_id text,
  from_number text,
  to_number text,
  body text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_company ON public.whatsapp_messages(company_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);

-- RLS: whatsapp_connections
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own company whatsapp connections"
ON public.whatsapp_connections FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can view own company whatsapp connections"
ON public.whatsapp_connections FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- RLS: whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own company whatsapp messages"
ON public.whatsapp_messages FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can view own company whatsapp messages"
ON public.whatsapp_messages FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
