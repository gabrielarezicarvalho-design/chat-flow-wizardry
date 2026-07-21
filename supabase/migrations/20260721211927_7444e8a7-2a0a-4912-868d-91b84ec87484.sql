
-- ============ COBRANCAS ============
CREATE TABLE public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  telefone TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  vencimento DATE NOT NULL DEFAULT CURRENT_DATE,
  recorrencia TEXT NOT NULL DEFAULT 'unica' CHECK (recorrencia IN ('unica','semanal','mensal','anual')),
  whatsapp_connection_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','canceled')),
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  checkout_url TEXT,
  mercado_pago_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cobrancas_company ON public.cobrancas(company_id);
CREATE INDEX idx_cobrancas_vencimento ON public.cobrancas(vencimento);
CREATE INDEX idx_cobrancas_status ON public.cobrancas(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas TO authenticated;
GRANT ALL ON public.cobrancas TO service_role;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobrancas company access" ON public.cobrancas
  FOR ALL TO authenticated
  USING (company_id IS NULL OR company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id IS NULL OR company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_cobrancas_updated
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VENDAS ============
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cliente TEXT NOT NULL,
  produto TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendas_company ON public.vendas(company_id);
CREATE INDEX idx_vendas_data ON public.vendas(data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas company access" ON public.vendas
  FOR ALL TO authenticated
  USING (company_id IS NULL OR company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id IS NULL OR company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_vendas_updated
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CUSTOS ============
CREATE TABLE public.custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_custos_company ON public.custos(company_id);
CREATE INDEX idx_custos_data ON public.custos(data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos TO authenticated;
GRANT ALL ON public.custos TO service_role;
ALTER TABLE public.custos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custos company access" ON public.custos
  FOR ALL TO authenticated
  USING (company_id IS NULL OR company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id IS NULL OR company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_custos_updated
  BEFORE UPDATE ON public.custos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MERCADO PAGO CONFIG ============
CREATE TABLE public.mercado_pago_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  apelido TEXT,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mercado_pago_configs TO authenticated;
GRANT ALL ON public.mercado_pago_configs TO service_role;
ALTER TABLE public.mercado_pago_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp config company access" ON public.mercado_pago_configs
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_mp_config_updated
  BEFORE UPDATE ON public.mercado_pago_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
