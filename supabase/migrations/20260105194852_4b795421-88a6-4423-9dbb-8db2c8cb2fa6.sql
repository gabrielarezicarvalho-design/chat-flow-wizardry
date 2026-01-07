-- Drop the existing foreign key constraint
ALTER TABLE public.ai_tickets 
DROP CONSTRAINT IF EXISTS ai_tickets_agent_id_fkey;

-- Re-add the constraint with ON DELETE SET NULL
ALTER TABLE public.ai_tickets 
ADD CONSTRAINT ai_tickets_agent_id_fkey 
FOREIGN KEY (agent_id) 
REFERENCES public.agents(id) 
ON DELETE SET NULL;