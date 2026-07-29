-- Corrigir função is_admin_user para verificar também a tabela user_roles
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);

CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Verificar role admin na tabela user_roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND role = 'admin'
  )
  -- OU verificar is_company_admin no profile
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = check_user_id 
    AND is_company_admin = true
  )
  -- OU verificar email do Next Pro
  OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = check_user_id 
    AND (
      email ILIKE '%@nextpro%' 
      OR email ILIKE '%@internal.nextpro%'
    )
  );
$$;