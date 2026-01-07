-- Create campaign templates table
CREATE TABLE public.campaign_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  interactive_type TEXT DEFAULT 'none',
  buttons JSONB DEFAULT '[]'::jsonb,
  list_items JSONB DEFAULT '[]'::jsonb,
  carousel_cards JSONB DEFAULT '[]'::jsonb,
  contact_source TEXT DEFAULT 'manual',
  selected_tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own templates" 
ON public.campaign_templates FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates" 
ON public.campaign_templates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" 
ON public.campaign_templates FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" 
ON public.campaign_templates FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_campaign_templates_updated_at
BEFORE UPDATE ON public.campaign_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();