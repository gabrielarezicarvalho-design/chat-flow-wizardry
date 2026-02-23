-- Add features override column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS features text[] DEFAULT NULL;

-- When features is NULL, use plan features. When set, use company-specific features.