-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flows table
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  flow_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  message_type TEXT DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_responses table
CREATE TABLE IF NOT EXISTS public.campaign_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  response_type TEXT,
  response_value TEXT,
  response_text TEXT,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_templates table
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  connection_id UUID,
  message_type TEXT DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  interactive_type TEXT,
  buttons JSONB DEFAULT '[]',
  list_items JSONB DEFAULT '[]',
  carousel_cards JSONB DEFAULT '[]',
  contact_source TEXT,
  selected_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create birthday_campaigns table
CREATE TABLE IF NOT EXISTS public.birthday_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  connection_id UUID,
  message_type TEXT DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  interactive_type TEXT,
  buttons JSONB,
  days_before INTEGER DEFAULT 0,
  send_time TEXT DEFAULT '09:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create birthday_contacts table
CREATE TABLE IF NOT EXISTS public.birthday_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.birthday_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  birth_date DATE NOT NULL,
  last_sent_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_avatar TEXT,
  status TEXT DEFAULT 'open',
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  assigned_to UUID,
  tags TEXT[],
  protocol TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id TEXT,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  status TEXT DEFAULT 'sent',
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table (AI agents)
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4',
  temperature NUMERIC DEFAULT 0.7,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for leads
CREATE POLICY "Users can manage own leads" ON public.leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all leads" ON public.leads FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for flows
CREATE POLICY "Users can manage own flows" ON public.flows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all flows" ON public.flows FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for campaigns
CREATE POLICY "Users can manage own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all campaigns" ON public.campaigns FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for campaign_responses
CREATE POLICY "Users can manage own responses" ON public.campaign_responses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all responses" ON public.campaign_responses FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for campaign_templates
CREATE POLICY "Users can manage own templates" ON public.campaign_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all templates" ON public.campaign_templates FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for birthday_campaigns
CREATE POLICY "Users can manage own birthday campaigns" ON public.birthday_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all birthday campaigns" ON public.birthday_campaigns FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for birthday_contacts
CREATE POLICY "Users can manage own birthday contacts" ON public.birthday_contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all birthday contacts" ON public.birthday_contacts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for tags
CREATE POLICY "Users can manage own tags" ON public.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tags" ON public.tags FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for conversations
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all conversations" ON public.conversations FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for messages
CREATE POLICY "Users can manage messages in own conversations" ON public.messages FOR ALL 
USING (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all messages" ON public.messages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for agents
CREATE POLICY "Users can manage own agents" ON public.agents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all agents" ON public.agents FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add update triggers
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON public.flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();