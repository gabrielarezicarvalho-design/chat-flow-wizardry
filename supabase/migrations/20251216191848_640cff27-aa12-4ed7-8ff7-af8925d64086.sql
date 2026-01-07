
-- Corrigir políticas RLS da tabela conversations para serem PERMISSIVE
-- O problema é que as políticas estão como RESTRICTIVE, o que requer que TODAS sejam verdadeiras
-- Precisamos que QUALQUER UMA seja verdadeira (OR lógico)

-- Primeiro, remover as políticas existentes
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Agents can view assigned conversations" ON public.conversations;
DROP POLICY IF EXISTS "Agents can view department queue conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Agents can update assigned conversations" ON public.conversations;
DROP POLICY IF EXISTS "Agents can update department queue conversations" ON public.conversations;

-- Criar políticas SELECT como PERMISSIVE (padrão)
-- Donos podem ver suas próprias conversas
CREATE POLICY "Users can view own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = user_id);

-- Agentes podem ver conversas atribuídas a eles
CREATE POLICY "Agents can view assigned conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = assigned_agent);

-- Agentes podem ver conversas na fila de seus departamentos
CREATE POLICY "Agents can view department queue conversations" 
ON public.conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_members.department_id = conversations.department_id
    AND department_members.agent_id = auth.uid()
  )
);

-- Políticas INSERT
CREATE POLICY "Users can create own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Políticas UPDATE - donos
CREATE POLICY "Users can update own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas UPDATE - agentes atribuídos
CREATE POLICY "Agents can update assigned conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = assigned_agent);

-- Políticas UPDATE - agentes podem aceitar conversas da fila do departamento
CREATE POLICY "Agents can update department queue conversations" 
ON public.conversations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_members.department_id = conversations.department_id
    AND department_members.agent_id = auth.uid()
  )
);

-- Políticas DELETE - apenas donos
CREATE POLICY "Users can delete own conversations" 
ON public.conversations 
FOR DELETE 
USING (auth.uid() = user_id);
