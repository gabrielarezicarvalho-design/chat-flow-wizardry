
CREATE OR REPLACE FUNCTION public.get_company_cycle_start(_company_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT COALESCE(created_at, now()) AS created_at
    FROM public.companies
    WHERE id = _company_id
  ),
  months AS (
    SELECT (c.created_at + (n || ' months')::interval) AS d
    FROM c, generate_series(0, 1200) n
  )
  SELECT COALESCE(MAX(d), now()) FROM months WHERE d <= now();
$$;

CREATE OR REPLACE FUNCTION public.get_plan_usage(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cycle_start timestamptz;
  result jsonb;
BEGIN
  IF _company_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  cycle_start := public.get_company_cycle_start(_company_id);

  SELECT jsonb_build_object(
    'cycle_start', cycle_start,
    'cycle_end', cycle_start + interval '1 month',
    'users',       (SELECT count(*) FROM public.profiles         WHERE company_id = _company_id),
    'attendants',  (SELECT count(*) FROM public.user_permissions WHERE company_id = _company_id),
    'connections', (SELECT count(*) FROM public.connections      WHERE company_id = _company_id),
    'agents',      (SELECT count(*) FROM public.agents           WHERE company_id = _company_id),
    'flows',       (SELECT count(*) FROM public.flows            WHERE company_id = _company_id),
    'departments', (SELECT count(*) FROM public.departments      WHERE company_id = _company_id),
    'mass_sends_month', (SELECT COALESCE(SUM(sent_count),0)::int FROM public.campaigns
                          WHERE company_id = _company_id AND created_at >= cycle_start),
    'contacts_month',   (SELECT count(*) FROM public.leads
                          WHERE company_id = _company_id AND created_at >= cycle_start),
    'sales_month',      (SELECT count(*) FROM public.vendas
                          WHERE company_id = _company_id AND created_at >= cycle_start),
    'cobrancas_month',  (SELECT count(*) FROM public.cobrancas
                          WHERE company_id = _company_id AND created_at >= cycle_start)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_cycle_start(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_plan_usage(uuid) TO authenticated, service_role;
