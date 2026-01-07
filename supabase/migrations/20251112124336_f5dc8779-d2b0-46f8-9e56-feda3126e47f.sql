-- Add columns needed for UZAPI webhook integration
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS instance_id TEXT,
  ADD COLUMN IF NOT EXISTS from_number TEXT,
  ADD COLUMN IF NOT EXISTS to_number TEXT,
  ADD COLUMN IF NOT EXISTS is_from_me BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Make conversation_id nullable for webhook messages (will be linked later)
ALTER TABLE public.messages 
  ALTER COLUMN conversation_id DROP NOT NULL;

-- Create index on instance_id for performance
CREATE INDEX IF NOT EXISTS idx_messages_instance_id ON public.messages(instance_id);

-- Update existing RLS policies to allow service role to insert
DROP POLICY IF EXISTS "service_role_all" ON public.messages;
CREATE POLICY "service_role_full_access" ON public.messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);