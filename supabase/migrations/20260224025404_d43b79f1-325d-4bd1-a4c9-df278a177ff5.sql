ALTER TABLE public.white_label_partners
ADD COLUMN IF NOT EXISTS uazapi_base_url text,
ADD COLUMN IF NOT EXISTS uazapi_admin_token text,
ADD COLUMN IF NOT EXISTS uazapi_environment text DEFAULT 'TESTE';

NOTIFY pgrst, 'reload schema';