
ALTER TABLE public.cobrancas 
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;
ALTER TABLE public.mercado_pago_configs 
  ADD COLUMN IF NOT EXISTS confirmation_template TEXT DEFAULT E'✅ *Pagamento confirmado!*\n\nOlá {nome}, recebemos seu pagamento de *R$ {valor}* referente a *{descricao}*.\n\nMuito obrigado! 🙌',
  ADD COLUMN IF NOT EXISTS confirmation_enabled BOOLEAN DEFAULT true;
