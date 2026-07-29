-- Função para verificar se usuário é admin
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
    AND (is_company_admin = true OR username = 'admin' OR full_name ILIKE '%admin%')
  )
  OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = check_user_id 
    AND (email ILIKE '%@nextpro%' OR raw_user_meta_data->>'role' = 'admin')
  );
$$;

-- Função para admin buscar TODOS os agentes
CREATE OR REPLACE FUNCTION public.admin_get_all_agents()
RETURNS TABLE (
  id uuid,
  name text,
  platform text,
  status text,
  model text,
  conversations_today integer,
  avg_response_time text,
  satisfaction text,
  user_id uuid,
  created_at timestamptz,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar todos os agentes';
  END IF;
  
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.platform,
    a.status,
    a.model,
    a.conversations_today,
    a.avg_response_time,
    a.satisfaction,
    a.user_id,
    a.created_at,
    p.company_name
  FROM agents a
  LEFT JOIN profiles p ON a.user_id = p.id
  ORDER BY a.created_at DESC;
END;
$$;

-- Função para admin buscar TODAS as conexões
CREATE OR REPLACE FUNCTION public.admin_get_all_connections()
RETURNS TABLE (
  id uuid,
  name text,
  platform text,
  status text,
  environment text,
  user_id uuid,
  created_at timestamptz,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.platform,
    c.status,
    c.environment,
    c.user_id,
    c.created_at,
    p.company_name
  FROM connections c
  LEFT JOIN profiles p ON c.user_id = p.id
  ORDER BY c.created_at DESC;
END;
$$;

-- Função para admin buscar TODOS os backups
CREATE OR REPLACE FUNCTION public.admin_get_all_backups()
RETURNS TABLE (
  id uuid,
  file_name text,
  backup_month text,
  protocol_number text,
  drive_file_url text,
  drive_file_id text,
  created_at timestamptz,
  user_id uuid,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  RETURN QUERY
  SELECT 
    cb.id,
    cb.file_name,
    cb.backup_month,
    cb.protocol_number,
    cb.drive_file_url,
    cb.drive_file_id,
    cb.created_at,
    cb.user_id,
    p.company_name
  FROM conversation_backups cb
  LEFT JOIN profiles p ON cb.user_id = p.id
  ORDER BY cb.created_at DESC
  LIMIT 500;
END;
$$;

-- Função para admin obter estatísticas de storage globais
CREATE OR REPLACE FUNCTION public.admin_get_storage_stats()
RETURNS TABLE (
  total_agents bigint,
  total_connections bigint,
  total_backups bigint,
  total_companies bigint,
  active_agents bigint,
  connected_connections bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM agents)::bigint,
    (SELECT COUNT(*) FROM connections)::bigint,
    (SELECT COUNT(*) FROM conversation_backups)::bigint,
    (SELECT COUNT(DISTINCT id) FROM companies)::bigint,
    (SELECT COUNT(*) FROM agents WHERE status = 'active')::bigint,
    (SELECT COUNT(*) FROM connections WHERE status = 'connected')::bigint;
END;
$$;