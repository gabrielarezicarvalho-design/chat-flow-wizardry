-- Add column to control group messages filtering
ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS filter_groups BOOLEAN DEFAULT true;