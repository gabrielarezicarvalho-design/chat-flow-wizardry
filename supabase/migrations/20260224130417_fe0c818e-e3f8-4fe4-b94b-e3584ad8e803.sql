-- Add attendance_type column to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS attendance_type text NOT NULL DEFAULT 'ura';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_conversations_attendance_type ON public.conversations(attendance_type);

COMMENT ON COLUMN public.conversations.attendance_type IS 'Type of attendance: agent (human), ai (artificial intelligence), ura (IVR flow)';
