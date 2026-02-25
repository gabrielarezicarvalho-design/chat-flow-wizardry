
-- Table to track flow execution state per conversation
CREATE TABLE public.flow_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  company_id UUID NOT NULL,
  flow_id UUID NOT NULL,
  current_node_id TEXT NOT NULL,
  error_count INT NOT NULL DEFAULT 0,
  variables JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'waiting_input',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by conversation
CREATE UNIQUE INDEX idx_flow_sessions_conversation ON public.flow_sessions (conversation_id) WHERE status = 'waiting_input';
CREATE INDEX idx_flow_sessions_company ON public.flow_sessions (company_id);

-- Enable RLS
ALTER TABLE public.flow_sessions ENABLE ROW LEVEL SECURITY;

-- Service role only (edge functions use service role key)
CREATE POLICY "Service role full access on flow_sessions"
  ON public.flow_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_flow_sessions_updated_at
  BEFORE UPDATE ON public.flow_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
