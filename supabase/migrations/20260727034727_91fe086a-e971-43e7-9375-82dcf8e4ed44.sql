
DO $$
DECLARE
  v_company_id uuid;
BEGIN
  INSERT INTO public.companies (name, slug, plan, is_active, max_users, max_connections)
  VALUES ('Next Pro', 'next-pro', 'business', true, 9999, 9999)
  RETURNING id INTO v_company_id;

  UPDATE public.profiles
  SET company_id = v_company_id, is_company_admin = true
  WHERE id IN ('d4bcd3d9-9f47-4c74-9777-a8ce08be98ed','251db534-f88e-48ed-920b-c2d7faf5cc67');

  INSERT INTO public.platform_subscriptions (company_id, user_id, tier, billing, amount, status, current_period_end)
  VALUES (v_company_id, 'd4bcd3d9-9f47-4c74-9777-a8ce08be98ed', 'business', 'monthly', 99.90, 'authorized', now() + interval '10 years');
END $$;
