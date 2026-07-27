CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  tier text NOT NULL CHECK (tier IN ('start','business')),
  billing text NOT NULL CHECK (billing IN ('monthly','annual')),
  amount numeric NOT NULL,
  mp_preapproval_id text,
  mp_init_point text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','paused','cancelled','expired')),
  current_period_end timestamptz,
  last_payment_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_subs_company ON public.platform_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_subs_preapproval ON public.platform_subscriptions(mp_preapproval_id);

GRANT SELECT ON public.platform_subscriptions TO authenticated;
GRANT ALL ON public.platform_subscriptions TO service_role;

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can view their subscription"
  ON public.platform_subscriptions FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_platform_subs_updated_at
  BEFORE UPDATE ON public.platform_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();