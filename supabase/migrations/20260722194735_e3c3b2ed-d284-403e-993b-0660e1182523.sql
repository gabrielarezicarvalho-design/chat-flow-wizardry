ALTER TABLE public.mercado_pago_configs ALTER COLUMN pix_template SET DEFAULT 'Olá {{nome}}, segue seu Pix: {{pix_copia_cola}} no valor de {{valor}}.';
UPDATE public.mercado_pago_configs SET pix_template = 'Olá {{nome}}, segue seu Pix: {{pix_copia_cola}} no valor de {{valor}}.' WHERE pix_template IS NULL;
ALTER TABLE public.mercado_pago_configs ALTER COLUMN pix_template DROP NOT NULL;