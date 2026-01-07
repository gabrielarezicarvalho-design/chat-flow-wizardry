-- Atualizar profile do admin para marcar is_company_admin
UPDATE profiles 
SET is_company_admin = true 
WHERE id = '9f192877-5847-451e-9e99-8ffc0e17acb2';

-- Atualizar função is_admin_user para incluir todos os emails @marketflow
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);

CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = check_user_id 
    AND is_company_admin = true
  )
  OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = check_user_id 
    AND (
      email ILIKE '%@marketflow%' 
      OR email = 'admin@marketflow.com.br'
      OR raw_user_meta_data->>'role' = 'admin'
      OR raw_user_meta_data->>'full_name' ILIKE '%admin%'
    )
  );
$$;