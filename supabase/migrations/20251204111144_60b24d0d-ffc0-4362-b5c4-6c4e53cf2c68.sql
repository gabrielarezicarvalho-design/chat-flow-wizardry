-- Drop old constraint and add new one that includes "sistema"
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_remetente_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_remetente_check CHECK (remetente = ANY (ARRAY['usuario'::text, 'agente'::text, 'sistema'::text]));