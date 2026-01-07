-- Remove a foreign key existente que aponta para agents
ALTER TABLE public.department_members DROP CONSTRAINT IF EXISTS department_members_agent_id_fkey;

-- Adiciona nova foreign key apontando para profiles
ALTER TABLE public.department_members 
ADD CONSTRAINT department_members_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;