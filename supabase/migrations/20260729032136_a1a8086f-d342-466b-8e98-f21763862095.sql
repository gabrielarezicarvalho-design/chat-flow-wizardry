CREATE TABLE public.plan_limits (
  slug text PRIMARY KEY,
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_annual numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_limits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_limits TO authenticated;
GRANT ALL ON public.plan_limits TO service_role;

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plans"
ON public.plan_limits FOR SELECT
USING (true);

CREATE POLICY "Admins can insert plans"
ON public.plan_limits FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
ON public.plan_limits FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
ON public.plan_limits FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_plan_limits_updated_at
BEFORE UPDATE ON public.plan_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_limits (slug, name, price_monthly, price_annual, sort_order, limits) VALUES
('basic', 'Basic', 0, 0, 1, '{"attendants":1,"connections":1,"agents":1,"flows":1,"departments":1,"users":2,"mass_sends_month":20,"contacts_month":50,"sales_month":50,"cobrancas_month":50}'::jsonb),
('start', 'Start', 49.90, 41.58, 2, '{"attendants":5,"connections":2,"agents":3,"flows":3,"departments":4,"users":10,"mass_sends_month":100,"contacts_month":500,"sales_month":500,"cobrancas_month":500}'::jsonb),
('business', 'Business', 99.90, 83.25, 3, '{"attendants":null,"connections":null,"agents":null,"flows":null,"departments":null,"users":null,"mass_sends_month":null,"contacts_month":null,"sales_month":null,"cobrancas_month":null}'::jsonb);