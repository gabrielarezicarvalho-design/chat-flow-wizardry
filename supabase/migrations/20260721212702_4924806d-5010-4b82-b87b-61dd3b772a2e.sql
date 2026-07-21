
ALTER TABLE public.mercado_pago_configs
  ADD COLUMN IF NOT EXISTS pix_template text NOT NULL DEFAULT
    'Olá {cliente}! 👋

Segue seu Pix no valor de *R$ {valor}* referente a: {descricao}

*Vencimento:* {vencimento}

*Pix Copia e Cola:*
{pix_copia_cola}

Ou pague pelo link: {link_pagamento}

Qualquer dúvida, estamos à disposição! 🙏',
  ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL;
