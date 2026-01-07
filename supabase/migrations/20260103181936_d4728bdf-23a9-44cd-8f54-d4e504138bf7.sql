-- Add voice configuration columns to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS voice_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS voice_id text DEFAULT 'pFZP5JQG7iQjIQuC4Bku',
ADD COLUMN IF NOT EXISTS voice_stability numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS voice_similarity numeric DEFAULT 0.75,
ADD COLUMN IF NOT EXISTS voice_speed numeric DEFAULT 1.0;

-- Add comment for documentation
COMMENT ON COLUMN public.agents.voice_enabled IS 'Whether the agent responds with audio when receiving audio';
COMMENT ON COLUMN public.agents.voice_id IS 'ElevenLabs voice ID for TTS';
COMMENT ON COLUMN public.agents.voice_stability IS 'Voice stability setting (0-1)';
COMMENT ON COLUMN public.agents.voice_similarity IS 'Voice similarity boost setting (0-1)';
COMMENT ON COLUMN public.agents.voice_speed IS 'Speech speed multiplier (0.7-1.3)';