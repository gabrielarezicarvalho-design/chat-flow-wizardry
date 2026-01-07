-- Add auto_save_contacts column to connections table
ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS auto_save_contacts boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.connections.auto_save_contacts IS 'Whether to automatically save new contacts from incoming messages';