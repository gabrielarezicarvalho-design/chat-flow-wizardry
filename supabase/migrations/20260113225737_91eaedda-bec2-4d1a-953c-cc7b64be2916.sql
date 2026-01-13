ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS user_id uuid;