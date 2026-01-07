-- Tabela para ações automáticas de campanha (etiquetas)
CREATE TABLE public.campaign_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.campaign_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'tag_on_send', 'tag_on_response'
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela para respostas de campanhas
CREATE TABLE public.campaign_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  response_text text,
  response_type text DEFAULT 'text', -- 'text', 'button', 'list'
  response_value text, -- valor selecionado se for botão/lista
  responded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela para campanhas de aniversário
CREATE TABLE public.birthday_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  message_type text NOT NULL DEFAULT 'text',
  message_content text,
  media_url text,
  interactive_type text DEFAULT 'none',
  buttons jsonb DEFAULT '[]'::jsonb,
  days_before integer DEFAULT 0, -- 0 = no dia, 1 = 1 dia antes, etc
  send_time text DEFAULT '09:00', -- hora do envio
  is_active boolean DEFAULT true,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela para contatos de aniversário
CREATE TABLE public.birthday_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.birthday_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  birth_date date NOT NULL,
  last_sent_at timestamp with time zone, -- ultima vez que enviou mensagem
  last_sent_year integer, -- ano do ultimo envio para evitar duplicatas
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela para pesquisas de satisfação
CREATE TABLE public.satisfaction_surveys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  message_content text NOT NULL,
  survey_type text NOT NULL DEFAULT 'buttons', -- 'buttons', 'poll', 'nps'
  options jsonb NOT NULL DEFAULT '[]'::jsonb, -- opções de resposta
  is_active boolean DEFAULT true,
  total_sent integer DEFAULT 0,
  total_responses integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela para respostas das pesquisas de satisfação
CREATE TABLE public.satisfaction_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id uuid REFERENCES public.satisfaction_surveys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  response_value text NOT NULL, -- valor da resposta (ex: "Satisfeito", "5", etc)
  response_score integer, -- pontuação numérica se aplicável
  feedback_text text, -- comentário adicional se houver
  responded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_responses ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_actions
CREATE POLICY "Users can view own campaign_actions" ON public.campaign_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own campaign_actions" ON public.campaign_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaign_actions" ON public.campaign_actions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign_actions" ON public.campaign_actions FOR DELETE USING (auth.uid() = user_id);

-- Policies for campaign_responses
CREATE POLICY "Users can view own campaign_responses" ON public.campaign_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own campaign_responses" ON public.campaign_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign_responses" ON public.campaign_responses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "service_role_full_access_campaign_responses" ON public.campaign_responses FOR ALL USING (true) WITH CHECK (true);

-- Policies for birthday_campaigns
CREATE POLICY "Users can view own birthday_campaigns" ON public.birthday_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own birthday_campaigns" ON public.birthday_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own birthday_campaigns" ON public.birthday_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own birthday_campaigns" ON public.birthday_campaigns FOR DELETE USING (auth.uid() = user_id);

-- Policies for birthday_contacts
CREATE POLICY "Users can view own birthday_contacts" ON public.birthday_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own birthday_contacts" ON public.birthday_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own birthday_contacts" ON public.birthday_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own birthday_contacts" ON public.birthday_contacts FOR DELETE USING (auth.uid() = user_id);

-- Policies for satisfaction_surveys
CREATE POLICY "Users can view own satisfaction_surveys" ON public.satisfaction_surveys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own satisfaction_surveys" ON public.satisfaction_surveys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own satisfaction_surveys" ON public.satisfaction_surveys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own satisfaction_surveys" ON public.satisfaction_surveys FOR DELETE USING (auth.uid() = user_id);

-- Policies for satisfaction_responses
CREATE POLICY "Users can view own satisfaction_responses" ON public.satisfaction_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own satisfaction_responses" ON public.satisfaction_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own satisfaction_responses" ON public.satisfaction_responses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "service_role_full_access_satisfaction_responses" ON public.satisfaction_responses FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_campaign_actions_updated_at BEFORE UPDATE ON public.campaign_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_birthday_campaigns_updated_at BEFORE UPDATE ON public.birthday_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_satisfaction_surveys_updated_at BEFORE UPDATE ON public.satisfaction_surveys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_campaign_responses_campaign_id ON public.campaign_responses(campaign_id);
CREATE INDEX idx_campaign_responses_contact_phone ON public.campaign_responses(contact_phone);
CREATE INDEX idx_birthday_contacts_birth_date ON public.birthday_contacts(birth_date);
CREATE INDEX idx_birthday_contacts_campaign_id ON public.birthday_contacts(campaign_id);
CREATE INDEX idx_satisfaction_responses_survey_id ON public.satisfaction_responses(survey_id);