
CREATE TABLE public.pix_reminder_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  cobranca_id UUID REFERENCES public.cobrancas(id) ON DELETE CASCADE,
  connection_id UUID,
  telefone TEXT,
  cliente_nome TEXT,
  valor NUMERIC,
  vencimento DATE,
  template TEXT NOT NULL,
  message_text TEXT NOT NULL,
  pix_copia_cola TEXT,
  link_pagamento TEXT,
  source TEXT NOT NULL DEFAULT 'cron',
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pix_reminder_history_company ON public.pix_reminder_history(company_id, created_at DESC);
CREATE INDEX idx_pix_reminder_history_cobranca ON public.pix_reminder_history(cobranca_id, created_at DESC);

GRANT SELECT ON public.pix_reminder_history TO authenticated;
GRANT ALL ON public.pix_reminder_history TO service_role;

ALTER TABLE public.pix_reminder_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own company reminder history"
  ON public.pix_reminder_history FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
