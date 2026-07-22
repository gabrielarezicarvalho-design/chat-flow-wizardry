ALTER TABLE public.cobrancas ADD COLUMN IF NOT EXISTS referencia TEXT;
CREATE INDEX IF NOT EXISTS idx_cobrancas_referencia ON public.cobrancas (company_id, referencia);