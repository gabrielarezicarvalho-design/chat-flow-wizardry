ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'whatsapp';