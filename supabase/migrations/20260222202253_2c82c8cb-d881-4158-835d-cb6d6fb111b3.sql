
-- Add missing columns to whatsapp_messages if they don't exist
ALTER TABLE public.whatsapp_messages 
  ADD COLUMN IF NOT EXISTS phone_number_id text,
  ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';
