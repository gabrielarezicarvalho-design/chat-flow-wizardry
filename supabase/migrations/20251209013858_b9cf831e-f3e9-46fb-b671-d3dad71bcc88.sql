-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add online status tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- Add work schedule (horário de trabalho)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '{"start": "08:00", "end": "18:00", "days": [1,2,3,4,5]}'::jsonb;