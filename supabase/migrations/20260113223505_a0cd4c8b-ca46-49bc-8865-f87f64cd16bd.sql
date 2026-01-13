-- Add missing columns to connections table
ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS base_url text,
ADD COLUMN IF NOT EXISTS token text,
ADD COLUMN IF NOT EXISTS environment text DEFAULT 'PROD',
ADD COLUMN IF NOT EXISTS credentials jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_test timestamp with time zone,
ADD COLUMN IF NOT EXISTS name text;

-- Copy instance_name to name for existing records
UPDATE public.connections SET name = instance_name WHERE name IS NULL;