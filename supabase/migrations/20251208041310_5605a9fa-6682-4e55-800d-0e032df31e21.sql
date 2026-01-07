-- Create table for AI provider keys per user
CREATE TABLE public.ai_provider_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'google', 'lovable'
  api_key TEXT, -- encrypted key
  is_configured BOOLEAN DEFAULT false,
  is_valid BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create table for agent knowledge documents
CREATE TABLE public.agent_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'txt', 'docx'
  file_size INTEGER,
  content_text TEXT, -- extracted text for RAG
  status TEXT DEFAULT 'processing', -- 'processing', 'ready', 'error'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for agent custom functions
CREATE TABLE public.agent_functions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  function_type TEXT NOT NULL, -- 'crm_query', 'create_task', 'http_request', 'custom'
  config JSONB DEFAULT '{}'::jsonb, -- function configuration
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add model column to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'google/gemini-2.5-flash';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS signature TEXT;

-- Enable RLS
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_functions ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_provider_keys
CREATE POLICY "Users can view own keys" ON public.ai_provider_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own keys" ON public.ai_provider_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keys" ON public.ai_provider_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keys" ON public.ai_provider_keys FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for agent_documents
CREATE POLICY "Users can view own documents" ON public.agent_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents" ON public.agent_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.agent_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.agent_documents FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for agent_functions
CREATE POLICY "Users can view own functions" ON public.agent_functions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own functions" ON public.agent_functions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own functions" ON public.agent_functions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own functions" ON public.agent_functions FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for agent documents
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-documents', 'agent-documents', false) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'agent-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (bucket_id = 'agent-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE USING (bucket_id = 'agent-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update trigger for updated_at
CREATE TRIGGER update_ai_provider_keys_updated_at BEFORE UPDATE ON public.ai_provider_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_documents_updated_at BEFORE UPDATE ON public.agent_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_functions_updated_at BEFORE UPDATE ON public.agent_functions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();