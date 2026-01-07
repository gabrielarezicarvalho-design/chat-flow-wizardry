-- Add permissions column to profiles table for persisting user permissions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add credentials column to connections table for messages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'connections' 
    AND column_name = 'credentials'
  ) THEN
    ALTER TABLE public.connections ADD COLUMN credentials JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;