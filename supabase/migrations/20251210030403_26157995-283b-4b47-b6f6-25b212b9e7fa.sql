-- Drop the old constraint and add a new one with all required statuses
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE public.conversations ADD CONSTRAINT conversations_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'closed'::text, 'archived'::text, 'waiting'::text, 'in_attendance'::text, 'in_queue'::text, 'in_flow'::text]));