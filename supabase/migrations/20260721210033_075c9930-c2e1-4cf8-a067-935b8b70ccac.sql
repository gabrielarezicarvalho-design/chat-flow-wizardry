
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS monthly_goal integer NOT NULL DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS sla_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS sla_flagged_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_conversations_sla_flagged ON public.conversations(company_id, sla_flagged) WHERE sla_flagged = true;
