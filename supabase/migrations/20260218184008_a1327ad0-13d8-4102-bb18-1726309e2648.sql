
-- Create telegram notification configs table
CREATE TABLE public.telegram_notification_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL DEFAULT 'Configuração Padrão',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Telegram settings
  telegram_bot_token TEXT,
  telegram_chat_id TEXT NOT NULL,
  
  -- Campaign start notifications
  notify_campaign_start BOOLEAN NOT NULL DEFAULT true,
  
  -- Lead response notifications
  notify_lead_response BOOLEAN NOT NULL DEFAULT true,
  filter_keywords TEXT[] DEFAULT '{}',
  filter_mode TEXT NOT NULL DEFAULT 'contains' CHECK (filter_mode IN ('contains', 'all', 'none')),
  
  -- Connection filter
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_notification_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own telegram configs"
  ON public.telegram_notification_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own telegram configs"
  ON public.telegram_notification_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram configs"
  ON public.telegram_notification_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own telegram configs"
  ON public.telegram_notification_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_telegram_notification_configs_updated_at
  BEFORE UPDATE ON public.telegram_notification_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
