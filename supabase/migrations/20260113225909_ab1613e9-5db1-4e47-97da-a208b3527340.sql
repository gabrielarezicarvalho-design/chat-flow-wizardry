-- Make instance_name nullable since code uses 'name' field instead
ALTER TABLE public.connections ALTER COLUMN instance_name DROP NOT NULL;

-- Set instance_name from name for existing records where instance_name is null
UPDATE public.connections SET instance_name = name WHERE instance_name IS NULL AND name IS NOT NULL;