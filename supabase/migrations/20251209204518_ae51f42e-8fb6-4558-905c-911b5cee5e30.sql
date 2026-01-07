-- Fix messages table RLS: Remove overly permissive SELECT policy and add owner-scoped policy

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Usuários autenticados podem ler mensagens" ON public.messages;

-- Create proper owner-scoped SELECT policy
CREATE POLICY "Users can read messages from own conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.id_da_conversa 
    AND conversations.user_id = auth.uid()
  )
);

-- Also fix INSERT policy to be owner-scoped (currently uses WITH CHECK true)
DROP POLICY IF EXISTS "Usuários autenticados podem inserir mensagens" ON public.messages;

CREATE POLICY "Users can insert messages to own conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.id_da_conversa 
    AND conversations.user_id = auth.uid()
  )
);