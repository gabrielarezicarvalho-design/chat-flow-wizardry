
-- ============ cobrancas_recorrentes ============
CREATE TABLE public.cobrancas_recorrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','cancelada')),
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cobrancas_recorrentes_company ON public.cobrancas_recorrentes(company_id);
CREATE INDEX idx_cobrancas_recorrentes_status ON public.cobrancas_recorrentes(status);
CREATE INDEX idx_cobrancas_recorrentes_dia ON public.cobrancas_recorrentes(dia_vencimento);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas_recorrentes TO authenticated;
GRANT ALL ON public.cobrancas_recorrentes TO service_role;

ALTER TABLE public.cobrancas_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members manage recorrentes"
  ON public.cobrancas_recorrentes FOR ALL
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_cobrancas_recorrentes_updated
  BEFORE UPDATE ON public.cobrancas_recorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ flow_forms ============
CREATE TABLE public.flow_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  initial_message TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answered BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_flow_forms_company ON public.flow_forms(company_id);
CREATE INDEX idx_flow_forms_connection ON public.flow_forms(connection_id);
CREATE INDEX idx_flow_forms_expires ON public.flow_forms(expires_at);

GRANT SELECT, UPDATE ON public.flow_forms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_forms TO authenticated;
GRANT ALL ON public.flow_forms TO service_role;

ALTER TABLE public.flow_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read active flow forms"
  ON public.flow_forms FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

CREATE POLICY "public can mark answered"
  ON public.flow_forms FOR UPDATE
  TO anon, authenticated
  USING (expires_at > now())
  WITH CHECK (expires_at > now());

CREATE POLICY "company members insert flow forms"
  ON public.flow_forms FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "company members delete flow forms"
  ON public.flow_forms FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_flow_forms_updated
  BEFORE UPDATE ON public.flow_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ leads_forms_responses ============
CREATE TABLE public.leads_forms_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.flow_forms(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_forms_responses_form ON public.leads_forms_responses(form_id);
CREATE INDEX idx_leads_forms_responses_phone ON public.leads_forms_responses(phone);

GRANT INSERT ON public.leads_forms_responses TO anon;
GRANT SELECT, INSERT, DELETE ON public.leads_forms_responses TO authenticated;
GRANT ALL ON public.leads_forms_responses TO service_role;

ALTER TABLE public.leads_forms_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can submit responses"
  ON public.leads_forms_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flow_forms f
      WHERE f.id = form_id AND f.expires_at > now()
    )
  );

CREATE POLICY "company members read responses"
  ON public.leads_forms_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flow_forms f
      WHERE f.id = form_id
        AND f.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "company members delete responses"
  ON public.leads_forms_responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flow_forms f
      WHERE f.id = form_id
        AND f.company_id = public.get_user_company_id(auth.uid())
    )
  );
