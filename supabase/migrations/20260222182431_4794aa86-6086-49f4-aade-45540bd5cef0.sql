
-- Add meta_business_id and meta_connected_at columns to whatsapp_connections
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS meta_business_id text,
  ADD COLUMN IF NOT EXISTS meta_connected_at timestamptz;
