-- Adicionar coluna para estado do fluxo nas conversas
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS flow_state JSONB DEFAULT NULL;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_conversations_flow_state 
ON public.conversations USING GIN (flow_state);

-- Comentário para documentação
COMMENT ON COLUMN public.conversations.flow_state IS 'Estado do fluxo em execução: {flow_id, current_node, waiting_for, vars, started_at}';