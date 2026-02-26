
-- Tabela para persistir permissões de cada usuário/agente
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Permissões do agente
  can_view_queue boolean NOT NULL DEFAULT false,
  can_open_new_chats boolean NOT NULL DEFAULT false,
  can_export_chats boolean NOT NULL DEFAULT false,
  can_access_internal_chat boolean NOT NULL DEFAULT false,
  can_manage_tasks boolean NOT NULL DEFAULT false,
  can_create_tasks_for_others boolean NOT NULL DEFAULT false,
  can_read_chat_history boolean NOT NULL DEFAULT false,
  can_access_wa_groups boolean NOT NULL DEFAULT false,
  can_supervise boolean NOT NULL DEFAULT false,
  auto_login_queue boolean NOT NULL DEFAULT false,
  always_online boolean NOT NULL DEFAULT false,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar todas as permissões
CREATE POLICY "Admins can manage all user_permissions"
  ON public.user_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver suas próprias permissões
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
