
-- Create campaign_contacts table to track individual contact send status
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON public.campaign_contacts(campaign_id, status);

-- Enable RLS
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own campaign contacts"
ON public.campaign_contacts
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all campaign contacts"
ON public.campaign_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
