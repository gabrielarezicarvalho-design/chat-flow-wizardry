-- Drop the existing check constraint and add a new one that includes META_CLOUD
ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_environment_check;

-- Add the new check constraint allowing META_CLOUD
ALTER TABLE public.connections ADD CONSTRAINT connections_environment_check 
CHECK (environment IN ('TESTE', 'PROD', 'META_CLOUD'));