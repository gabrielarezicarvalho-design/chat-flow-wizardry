-- Drop the old foreign key constraint to conversas table
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_id_da_conversa_fkey;

-- Add new foreign key constraint to conversations table
ALTER TABLE public.messages 
ADD CONSTRAINT messages_id_da_conversa_fkey 
FOREIGN KEY (id_da_conversa) 
REFERENCES public.conversations(id) 
ON DELETE CASCADE;