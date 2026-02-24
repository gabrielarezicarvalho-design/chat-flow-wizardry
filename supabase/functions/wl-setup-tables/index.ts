import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES_SQL = `
-- ============================================
-- MarketFlow White Label - Setup de Tabelas
-- ============================================

-- Função utilitária para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enum de roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'agent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função get_user_company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- ============ TABELAS ============

-- Companies
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text,
  logo_url text,
  primary_color text DEFAULT '#10b981',
  secondary_color text DEFAULT '#059669',
  custom_domain text,
  plan text DEFAULT 'basic',
  features text[],
  is_active boolean DEFAULT true,
  max_users integer DEFAULT 10,
  max_connections integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  full_name text,
  username text,
  avatar_url text,
  phone text,
  is_online boolean DEFAULT false,
  is_company_admin boolean DEFAULT false,
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Connections
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  name text,
  platform text DEFAULT 'whatsapp',
  instance_name text,
  instance_id text,
  phone_number text,
  status text DEFAULT 'disconnected',
  base_url text,
  token text,
  environment text DEFAULT 'PROD',
  qr_code text,
  webhook_url text,
  credentials jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_test timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Connections
CREATE TABLE IF NOT EXISTS public.user_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.connections(id),
  created_at timestamptz DEFAULT now()
);

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Department Members
CREATE TABLE IF NOT EXISTS public.department_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid REFERENCES public.departments(id),
  user_id uuid,
  is_supervisor boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  connection_id uuid REFERENCES public.connections(id),
  department_id uuid REFERENCES public.departments(id),
  contact_phone text NOT NULL,
  contact_name text,
  contact_avatar text,
  status text DEFAULT 'open',
  last_message text,
  last_message_at timestamptz,
  unread_count integer DEFAULT 0,
  assigned_to uuid,
  tags text[],
  protocol text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id),
  sender_type text NOT NULL,
  sender_id text,
  content text,
  message_type text DEFAULT 'text',
  media_url text,
  status text DEFAULT 'sent',
  external_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  phone text,
  email text,
  source text,
  status text DEFAULT 'new',
  notes text,
  tags text[],
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  status text DEFAULT 'pending',
  message_type text DEFAULT 'text',
  message_content text,
  media_url text,
  folder_id text,
  total_contacts integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaign Contacts
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Campaign Responses
CREATE TABLE IF NOT EXISTS public.campaign_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  campaign_id uuid REFERENCES public.campaigns(id),
  contact_phone text NOT NULL,
  contact_name text,
  response_type text,
  response_value text,
  response_text text,
  responded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Campaign Templates
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  connection_id uuid,
  name text NOT NULL,
  message_type text DEFAULT 'text',
  message_content text,
  media_url text,
  interactive_type text,
  contact_source text,
  selected_tags text[],
  buttons jsonb DEFAULT '[]',
  list_items jsonb DEFAULT '[]',
  carousel_cards jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Flows
CREATE TABLE IF NOT EXISTS public.flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  trigger_type text,
  flow_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agents
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  system_prompt text,
  model text DEFAULT 'gpt-4',
  temperature numeric DEFAULT 0.7,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  key text NOT NULL,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Birthday Campaigns
CREATE TABLE IF NOT EXISTS public.birthday_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  connection_id uuid,
  name text NOT NULL,
  message_type text DEFAULT 'text',
  message_content text,
  media_url text,
  interactive_type text,
  buttons jsonb,
  days_before integer DEFAULT 0,
  send_time text DEFAULT '09:00',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Birthday Contacts
CREATE TABLE IF NOT EXISTS public.birthday_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  campaign_id uuid REFERENCES public.birthday_campaigns(id),
  name text NOT NULL,
  phone text NOT NULL,
  birth_date date NOT NULL,
  last_sent_year integer,
  created_at timestamptz DEFAULT now()
);

-- Smart Forms
CREATE TABLE IF NOT EXISTS public.smart_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  name text NOT NULL,
  welcome_message text DEFAULT 'Olá! Preencha o formulário abaixo:',
  success_message text DEFAULT 'Obrigado! Sua solicitação foi registrada.',
  fields jsonb DEFAULT '[]',
  whatsapp_confirmation boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Smart Form Submissions
CREATE TABLE IF NOT EXISTS public.smart_form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  form_id uuid REFERENCES public.smart_forms(id),
  connection_id uuid REFERENCES public.connections(id),
  department_id uuid REFERENCES public.departments(id),
  conversation_id uuid REFERENCES public.conversations(id),
  unique_token text NOT NULL,
  phone text NOT NULL,
  name text,
  status text DEFAULT 'pendente',
  answers jsonb DEFAULT '{}',
  notes text,
  submitted_at timestamptz,
  contacted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Telegram Notification Configs
CREATE TABLE IF NOT EXISTS public.telegram_notification_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  connection_id uuid REFERENCES public.connections(id),
  name text DEFAULT 'Configuração Padrão',
  telegram_bot_token text,
  telegram_chat_id text NOT NULL,
  is_active boolean DEFAULT true,
  notify_campaign_start boolean DEFAULT true,
  notify_lead_response boolean DEFAULT true,
  filter_keywords text[] DEFAULT '{}',
  filter_mode text DEFAULT 'contains',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- External API Keys
CREATE TABLE IF NOT EXISTS public.external_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  api_key text NOT NULL DEFAULT ('mk_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  permissions text[] DEFAULT '{connections,messages,conversations,webhooks}',
  webhook_url text,
  webhook_events text[] DEFAULT '{message.received,message.sent,connection.status}',
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- External API Logs
CREATE TABLE IF NOT EXISTS public.external_api_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  api_key_id uuid REFERENCES public.external_api_keys(id),
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  request_body jsonb DEFAULT '{}',
  response_body jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  price numeric DEFAULT 0,
  max_users integer DEFAULT 10,
  max_connections integer DEFAULT 3,
  features text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY,
  whatsapp_webhook_callback_url text,
  whatsapp_verify_token text,
  meta_api_version text DEFAULT 'v22.0',
  environment text DEFAULT 'PROD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WhatsApp Connections
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  provider text NOT NULL,
  status text DEFAULT 'disconnected',
  meta_phone_number_id text,
  meta_waba_id text,
  meta_access_token text,
  meta_verify_token text,
  meta_business_id text,
  meta_connected_at timestamptz,
  qr_api_url text,
  qr_instance_id text,
  qr_api_token text,
  last_error text,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WhatsApp Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  connection_id uuid REFERENCES public.whatsapp_connections(id),
  provider text NOT NULL,
  direction text NOT NULL,
  wa_message_id text,
  from_number text,
  to_number text,
  body text,
  status text DEFAULT 'sent',
  phone_number_id text,
  message_type text DEFAULT 'text',
  raw jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============ TRIGGER handle_new_user ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger para novos usuários (ignora se já existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ============ RLS POLICIES ============

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Storage bucket for campaign media
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-media', 'campaign-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-documents', 'agent-documents', false) ON CONFLICT (id) DO NOTHING;
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabase_url, supabase_service_role_key, action } = await req.json();

    if (!supabase_url || !supabase_service_role_key) {
      return new Response(
        JSON.stringify({ error: "Credenciais do Supabase são obrigatórias" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_sql") {
      return new Response(
        JSON.stringify({ sql: TABLES_SQL }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check_tables") {
      const partnerClient = createClient(supabase_url, supabase_service_role_key);
      
      const tableNames = [
        'companies', 'profiles', 'user_roles', 'connections', 'user_connections',
        'departments', 'department_members', 'conversations', 'messages', 'leads',
        'tags', 'campaigns', 'campaign_contacts', 'campaign_responses', 'campaign_templates',
        'flows', 'agents', 'settings', 'birthday_campaigns', 'birthday_contacts',
        'smart_forms', 'smart_form_submissions', 'telegram_notification_configs',
        'external_api_keys', 'external_api_logs', 'subscription_plans', 'app_settings',
        'whatsapp_connections', 'whatsapp_messages'
      ];

      const results: Record<string, boolean> = {};
      
      for (const table of tableNames) {
        try {
          const { error } = await partnerClient.from(table).select('id').limit(1);
          results[table] = !error;
        } catch {
          results[table] = false;
        }
      }

      return new Response(
        JSON.stringify({ tables: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check_storage") {
      const partnerClient = createClient(supabase_url, supabase_service_role_key);
      
      const { data: buckets, error } = await partnerClient.storage.listBuckets();
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bucketDetails = [];
      for (const bucket of buckets || []) {
        try {
          const { data: files } = await partnerClient.storage.from(bucket.name).list('', { limit: 100 });
          let totalSize = 0;
          const fileList = (files || []).filter(f => f.name !== '.emptyFolderPlaceholder').map(f => {
            totalSize += f.metadata?.size || 0;
            return {
              name: f.name,
              size: f.metadata?.size || 0,
              type: f.metadata?.mimetype || 'unknown',
              created_at: f.created_at,
            };
          });
          bucketDetails.push({
            name: bucket.name,
            public: bucket.public,
            files: fileList,
            totalSize,
            fileCount: fileList.length,
          });
        } catch {
          bucketDetails.push({
            name: bucket.name,
            public: bucket.public,
            files: [],
            totalSize: 0,
            fileCount: 0,
          });
        }
      }

      return new Response(
        JSON.stringify({ buckets: bucketDetails }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_file") {
      const { bucket_name, file_path } = await req.json();
      const partnerClient = createClient(supabase_url, supabase_service_role_key);
      
      const { error } = await partnerClient.storage.from(bucket_name).remove([file_path]);
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
