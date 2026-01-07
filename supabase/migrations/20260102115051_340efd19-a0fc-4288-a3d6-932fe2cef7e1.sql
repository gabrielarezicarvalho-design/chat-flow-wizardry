-- Adicionar senha de proteção para o parceiro acessar as configurações
ALTER TABLE public.white_label_partners
ADD COLUMN IF NOT EXISTS partner_password TEXT;