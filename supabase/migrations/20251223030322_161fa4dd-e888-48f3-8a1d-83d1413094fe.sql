-- Add Supabase connection fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT,
ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT;