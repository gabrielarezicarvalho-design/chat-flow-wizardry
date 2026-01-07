-- Create table for tracking campaign progress in real-time
CREATE TABLE public.campaign_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  connection_id UUID REFERENCES public.connections(id),
  total_messages INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  current_status TEXT NOT NULL DEFAULT 'pending', -- pending, sending, paused, completed, failed
  current_message_index INTEGER NOT NULL DEFAULT 0,
  delay_min INTEGER NOT NULL DEFAULT 10,
  delay_max INTEGER NOT NULL DEFAULT 30,
  pause_every_x INTEGER NOT NULL DEFAULT 0, -- 0 = no pause
  pause_duration INTEGER NOT NULL DEFAULT 60,
  next_send_at TIMESTAMP WITH TIME ZONE,
  pause_until TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  error_message TEXT
);

-- Enable Row Level Security
ALTER TABLE public.campaign_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own campaign progress" 
ON public.campaign_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaign progress" 
ON public.campaign_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign progress" 
ON public.campaign_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign progress" 
ON public.campaign_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaign_progress_updated_at
BEFORE UPDATE ON public.campaign_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_progress;