-- Add storage_limit column to companies (in GB, default 9GB)
ALTER TABLE public.companies
ADD COLUMN storage_limit integer NOT NULL DEFAULT 9;

-- Add custom_subdomain column for explicit subdomain configuration  
-- (slug already exists and is used as subdomain, but let's add a comment)
COMMENT ON COLUMN public.companies.slug IS 'Used as subdomain for multi-tenant access (e.g. slug.nextprochat.com.br)';
COMMENT ON COLUMN public.companies.storage_limit IS 'Storage quota in GB for VPS storage per company';