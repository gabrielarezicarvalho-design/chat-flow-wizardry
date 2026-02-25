
-- Add knowledge and capability fields to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS knowledge_text text,
ADD COLUMN IF NOT EXISTS can_understand_images boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_understand_audio boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_send_images boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_provider_for_vision text DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS ai_provider_for_audio text DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS knowledge_images text[] DEFAULT '{}';
