-- Add notes column to leads table for contact observations
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS notes TEXT;