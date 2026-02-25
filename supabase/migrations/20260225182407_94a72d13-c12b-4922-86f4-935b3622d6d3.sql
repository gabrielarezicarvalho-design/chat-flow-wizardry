
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS can_process_pdf boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_process_video boolean DEFAULT false;
