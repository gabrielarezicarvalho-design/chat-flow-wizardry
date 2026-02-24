
-- Add connection_id column to campaigns for linking to WhatsApp connection
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.connections(id);

-- Add contacts column to store phone numbers for scheduled campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS contacts jsonb DEFAULT '[]'::jsonb;

-- Add started_at column for tracking when campaign actually started sending
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;

-- Create index for faster scheduled campaign lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_status_scheduled ON public.campaigns(status, scheduled_at) WHERE status = 'scheduled';
