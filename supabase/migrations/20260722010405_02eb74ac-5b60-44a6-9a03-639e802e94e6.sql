
ALTER TABLE public.mercado_pago_configs
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_days_before integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reminder_interval_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS remind_after_due boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_template text NOT NULL DEFAULT
'⏰ Olá {cliente}! Lembrete do seu Pix de *R$ {valor}* — {descricao}

*Vencimento:* {vencimento}

*Pix Copia e Cola:*
{pix_copia_cola}

Ou pague pelo link: {link_pagamento}

Assim que pagar, o sistema confirma automaticamente. 🙏';

ALTER TABLE public.cobrancas
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cobrancas_reminder_scan
  ON public.cobrancas (status, vencimento)
  WHERE status = 'pending';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
