-- Add max_users and max_connections columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_connections integer DEFAULT 2;