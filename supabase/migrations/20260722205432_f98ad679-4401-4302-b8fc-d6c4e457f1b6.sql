
ALTER TABLE public.mercado_pago_configs
  ADD COLUMN IF NOT EXISTS ondemand_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ondemand_deadline_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS ondemand_interval_hours integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS ondemand_max_reminders integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS ondemand_template text NOT NULL DEFAULT 'Oi {cliente}! 👋 Notei que o PIX de *R$ {valor}* ({descricao} — ref: {referencia}) ainda não foi pago. Envio novamente para facilitar: {pix_copia_cola} — Qualquer dúvida é só me chamar. 🙌';
