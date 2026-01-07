-- Adicionar políticas RLS para service_role nas tabelas conversations e leads
-- Isso permite que o Edge Function wa-webhook-listener insira/atualize dados

-- Política para service_role na tabela leads
CREATE POLICY "service_role_full_access_leads"
ON public.leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política para service_role na tabela conversations
CREATE POLICY "service_role_full_access_conversations"
ON public.conversations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comentários explicativos
COMMENT ON POLICY "service_role_full_access_leads" ON public.leads IS 
'Permite que Edge Functions (usando service_role) criem e gerenciem leads automaticamente via webhooks';

COMMENT ON POLICY "service_role_full_access_conversations" ON public.conversations IS 
'Permite que Edge Functions (usando service_role) criem e gerenciem conversas automaticamente via webhooks';