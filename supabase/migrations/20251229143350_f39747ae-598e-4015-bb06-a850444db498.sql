-- Create table for webhook field configurations
CREATE TABLE public.webhook_field_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Configuração Padrão',
  is_active BOOLEAN DEFAULT true,
  
  -- Campos que serão capturados do webhook
  capture_contact_name BOOLEAN DEFAULT true,
  capture_contact_phone BOOLEAN DEFAULT true,
  capture_contact_address BOOLEAN DEFAULT false,
  capture_message_time BOOLEAN DEFAULT true,
  capture_campaign_name BOOLEAN DEFAULT true,
  capture_message_content BOOLEAN DEFAULT true,
  capture_response_type BOOLEAN DEFAULT true,
  capture_button_clicked BOOLEAN DEFAULT true,
  capture_list_selection BOOLEAN DEFAULT true,
  
  -- Campos personalizados adicionais
  custom_fields JSONB DEFAULT '[]'::jsonb,
  
  -- Filtros
  filter_campaigns JSONB DEFAULT '[]'::jsonb,
  filter_only_responses BOOLEAN DEFAULT false,
  filter_only_buttons BOOLEAN DEFAULT false,
  
  -- Webhook externo (para enviar dados para outro sistema)
  external_webhook_url TEXT,
  external_webhook_enabled BOOLEAN DEFAULT false,
  external_webhook_headers JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_field_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own webhook configs"
ON public.webhook_field_configs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhook configs"
ON public.webhook_field_configs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook configs"
ON public.webhook_field_configs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook configs"
ON public.webhook_field_configs
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_webhook_field_configs_updated_at
BEFORE UPDATE ON public.webhook_field_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();