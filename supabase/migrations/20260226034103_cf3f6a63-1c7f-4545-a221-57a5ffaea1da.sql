-- Add flow_state column to conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS flow_state jsonb DEFAULT NULL;

-- Clean up duplicates: keep only the most recent open conversation per phone+connection, close the rest
UPDATE public.conversations 
SET status = 'closed'
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY contact_phone, connection_id 
      ORDER BY updated_at DESC
    ) as rn
    FROM public.conversations
    WHERE status != 'closed'
  ) ranked
  WHERE rn > 1
);