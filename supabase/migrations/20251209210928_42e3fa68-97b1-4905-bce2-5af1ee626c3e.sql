-- Add status column to profiles for agent status (online, offline, paused)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';

-- Comment for documentation
COMMENT ON COLUMN public.profiles.status IS 'Agent status: online, offline, paused';