
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.agent_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  token_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_knowledge_chunks TO authenticated;
GRANT ALL ON public.agent_knowledge_chunks TO service_role;

ALTER TABLE public.agent_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read chunks from their company agents"
ON public.agent_knowledge_chunks
FOR SELECT
TO authenticated
USING (
  company_id IS NULL
  OR company_id = public.get_user_company_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE INDEX IF NOT EXISTS agent_knowledge_chunks_agent_idx
  ON public.agent_knowledge_chunks(agent_id);

CREATE INDEX IF NOT EXISTS agent_knowledge_chunks_embedding_idx
  ON public.agent_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_agent_knowledge(
  p_agent_id UUID,
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  min_similarity FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.agent_knowledge_chunks c
  WHERE c.agent_id = p_agent_id
    AND 1 - (c.embedding <=> query_embedding) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
