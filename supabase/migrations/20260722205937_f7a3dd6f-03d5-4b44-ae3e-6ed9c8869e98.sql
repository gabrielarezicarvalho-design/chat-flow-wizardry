ALTER TABLE public.mercado_pago_configs
  ADD COLUMN IF NOT EXISTS ondemand_min_valor NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ondemand_max_valor NUMERIC(12,2);