
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS signature text NULL;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS output_markers text NULL;
