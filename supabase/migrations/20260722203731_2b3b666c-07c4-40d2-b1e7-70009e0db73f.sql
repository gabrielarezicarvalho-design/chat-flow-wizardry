
CREATE TABLE public.cobrancas_recorrentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento IN (5, 15)),
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada')),
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  ultima_geracao_em TIMESTAMPTZ,
  ultima_cobranca_id UUID REFERENCES public.cobrancas(id) ON DELETE SET NULL,
  total_geradas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cobrancas_recorrentes_company ON public.cobrancas_recorrentes(company_id);
CREATE INDEX idx_cobrancas_recorrentes_status_dia ON public.cobrancas_recorrentes(status, dia_vencimento) WHERE status = 'ativa';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas_recorrentes TO authenticated;
GRANT ALL ON public.cobrancas_recorrentes TO service_role;

ALTER TABLE public.cobrancas_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam recorrências da própria empresa"
  ON public.cobrancas_recorrentes
  FOR ALL
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Service role acesso total recorrências"
  ON public.cobrancas_recorrentes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_cobrancas_recorrentes_updated_at
  BEFORE UPDATE ON public.cobrancas_recorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
