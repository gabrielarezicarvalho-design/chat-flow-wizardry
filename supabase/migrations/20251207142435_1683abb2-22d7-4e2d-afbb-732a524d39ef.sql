-- Add user_id column to conversas table for proper ownership
ALTER TABLE public.conversas ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Service role tem acesso total a conversas" ON public.conversas;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar conversas" ON public.conversas;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir conversas" ON public.conversas;
DROP POLICY IF EXISTS "Usuários autenticados podem ler conversas" ON public.conversas;

-- Create proper owner-based RLS policies for conversas
CREATE POLICY "Users can view own conversas" 
ON public.conversas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversas" 
ON public.conversas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversas" 
ON public.conversas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversas" 
ON public.conversas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role needs full access for Edge Functions
CREATE POLICY "service_role_full_access_conversas" 
ON public.conversas 
FOR ALL 
USING (true) 
WITH CHECK (true);