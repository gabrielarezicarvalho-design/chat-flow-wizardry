-- Criar tabela de departamentos
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de membros de departamentos (relação agentes-departamentos)
CREATE TABLE IF NOT EXISTS public.department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, agent_id)
);

-- Criar tabela de conexões/integrações
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- whatsapp, instagram, telegram, facebook, webhook
  name TEXT NOT NULL,
  credentials JSONB DEFAULT '{}',
  status TEXT DEFAULT 'disconnected', -- connected, disconnected, error
  last_test TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar colunas à tabela conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para departments
CREATE POLICY "Users can view own departments" ON public.departments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own departments" ON public.departments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own departments" ON public.departments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own departments" ON public.departments
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para department_members
CREATE POLICY "Users can view members of own departments" ON public.department_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.departments 
      WHERE departments.id = department_members.department_id 
      AND departments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members to own departments" ON public.department_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.departments 
      WHERE departments.id = department_members.department_id 
      AND departments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove members from own departments" ON public.department_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.departments 
      WHERE departments.id = department_members.department_id 
      AND departments.user_id = auth.uid()
    )
  );

-- Políticas RLS para connections
CREATE POLICY "Users can view own connections" ON public.connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own connections" ON public.connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON public.connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON public.connections
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();