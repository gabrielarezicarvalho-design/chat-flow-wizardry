-- Tabela para armazenar tokens OAuth do Google Drive por usuário
CREATE TABLE public.google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  folder_id TEXT, -- Pasta raiz de backups no Drive
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para log de backups realizados
CREATE TABLE public.conversation_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  lead_id UUID,
  protocol_number TEXT,
  backup_month TEXT NOT NULL, -- formato: 2024-01
  drive_file_id TEXT NOT NULL,
  drive_file_url TEXT,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_backups ENABLE ROW LEVEL SECURITY;

-- Policies para google_drive_tokens
CREATE POLICY "Users can view own tokens" ON public.google_drive_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.google_drive_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.google_drive_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.google_drive_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para conversation_backups
CREATE POLICY "Users can view own backups" ON public.conversation_backups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backups" ON public.conversation_backups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role access
CREATE POLICY "service_role_access_drive_tokens" ON public.google_drive_tokens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_access_backups" ON public.conversation_backups
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_google_drive_tokens_updated_at
  BEFORE UPDATE ON public.google_drive_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();