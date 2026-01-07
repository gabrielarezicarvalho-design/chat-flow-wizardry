-- Create table to store form responses from leads
CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  flow_id UUID REFERENCES public.flows(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  name TEXT,
  collected_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'novo',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own form_responses"
  ON public.form_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own form_responses"
  ON public.form_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own form_responses"
  ON public.form_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own form_responses"
  ON public.form_responses FOR DELETE
  USING (auth.uid() = user_id);

-- Service role access for edge functions
CREATE POLICY "service_role_full_access_form_responses"
  ON public.form_responses FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_form_responses_updated_at
  BEFORE UPDATE ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_form_responses_user_id ON public.form_responses(user_id);
CREATE INDEX idx_form_responses_status ON public.form_responses(status);
CREATE INDEX idx_form_responses_phone ON public.form_responses(phone);