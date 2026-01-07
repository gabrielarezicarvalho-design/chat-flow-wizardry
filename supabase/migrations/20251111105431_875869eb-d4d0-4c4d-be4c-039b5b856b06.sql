-- Add environment field to connections table
ALTER TABLE public.connections 
ADD COLUMN environment TEXT NOT NULL DEFAULT 'TESTE';

-- Add check constraint for valid environments
ALTER TABLE public.connections
ADD CONSTRAINT connections_environment_check 
CHECK (environment IN ('TESTE', 'PROD'));