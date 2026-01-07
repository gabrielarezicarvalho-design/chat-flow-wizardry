-- Adicionar campos para integração com Telegram na tabela webhook_field_configs
ALTER TABLE public.webhook_field_configs 
ADD COLUMN IF NOT EXISTS telegram_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_chat_id text,
ADD COLUMN IF NOT EXISTS telegram_filter_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS telegram_filter_mode text DEFAULT 'contains',
ADD COLUMN IF NOT EXISTS telegram_send_to_channel boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_send_to_group boolean DEFAULT false;