
-- Tabela de API keys para sistemas externos
CREATE TABLE public.external_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  api_key text NOT NULL UNIQUE DEFAULT 'mk_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  is_active boolean NOT NULL DEFAULT true,
  permissions text[] NOT NULL DEFAULT '{connections,messages,conversations,webhooks}',
  webhook_url text,
  webhook_events text[] DEFAULT '{message.received,message.sent,connection.status}',
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage own company api keys"
ON public.external_api_keys FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view own company api keys"
ON public.external_api_keys FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_external_api_keys_updated_at
BEFORE UPDATE ON public.external_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.external_api_keys;

-- Log de chamadas da API externa
CREATE TABLE public.external_api_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES public.external_api_keys(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  request_body jsonb DEFAULT '{}',
  response_body jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.external_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own company api logs"
ON public.external_api_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company_id(auth.uid()));
