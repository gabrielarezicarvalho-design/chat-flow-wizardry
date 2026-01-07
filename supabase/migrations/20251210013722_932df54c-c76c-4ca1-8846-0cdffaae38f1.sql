
-- Create AI tickets table for escalation cases
CREATE TABLE public.ai_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id),
  connection_id UUID REFERENCES public.connections(id),
  agent_id UUID REFERENCES public.agents(id),
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  reason TEXT NOT NULL,
  dissatisfaction_level TEXT DEFAULT 'medium',
  best_contact_time TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tickets"
  ON public.ai_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON public.ai_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON public.ai_tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tickets"
  ON public.ai_tickets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_access_ai_tickets"
  ON public.ai_tickets FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER TABLE public.ai_tickets REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_tickets;

-- Create trigger for updated_at
CREATE TRIGGER update_ai_tickets_updated_at
  BEFORE UPDATE ON public.ai_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
