
-- Create global app_settings table (single-row config)
CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  whatsapp_webhook_callback_url text,
  whatsapp_verify_token text,
  meta_api_version text DEFAULT 'v22.0',
  environment text DEFAULT 'PROD',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage app_settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read (needed for edge functions context)
CREATE POLICY "Authenticated can read app_settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Insert default row
INSERT INTO public.app_settings (id, whatsapp_webhook_callback_url, whatsapp_verify_token, meta_api_version, environment)
VALUES (1, '', '', 'v22.0', 'PROD');

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
