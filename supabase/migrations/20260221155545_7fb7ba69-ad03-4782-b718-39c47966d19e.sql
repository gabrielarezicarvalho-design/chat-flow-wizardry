
-- Criar tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_connections INTEGER NOT NULL DEFAULT 3,
  features TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all plans"
ON public.subscription_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone authenticated can view active plans (for dropdowns etc)
CREATE POLICY "Authenticated users can view active plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.subscription_plans (name, slug, price, max_users, max_connections, features) VALUES
('Basic', 'basic', 97, 10, 3, ARRAY['chat', 'flows_basic', 'tags', 'departments']),
('Pro', 'pro', 197, 25, 5, ARRAY['chat', 'flows_basic', 'flows_advanced', 'ai_agents', 'tags', 'departments', 'reports', 'mass_sending']),
('Enterprise', 'enterprise', 397, 999, 999, ARRAY['chat', 'flows_basic', 'flows_advanced', 'ai_agents', 'tags', 'departments', 'reports', 'mass_sending', 'smart_forms', 'google_drive', 'webhooks', 'scheduled_messages', 'internal_chat', 'leads_management', 'multi_connection']);
