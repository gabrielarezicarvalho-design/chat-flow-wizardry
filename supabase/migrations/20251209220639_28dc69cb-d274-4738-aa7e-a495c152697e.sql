-- Add protocol_number column to conversations for unique protocol tracking
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS protocol_number TEXT UNIQUE;

-- Add contract_number column for closing conversation
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS contract_number TEXT;

-- Add closing_notes column for observations when closing
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS closing_notes TEXT;

-- Create function to generate protocol number
CREATE OR REPLACE FUNCTION public.generate_protocol_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.protocol_number := 'PROT' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate protocol on insert
DROP TRIGGER IF EXISTS set_protocol_number ON public.conversations;
CREATE TRIGGER set_protocol_number
BEFORE INSERT ON public.conversations
FOR EACH ROW
WHEN (NEW.protocol_number IS NULL)
EXECUTE FUNCTION public.generate_protocol_number();

-- Create message_templates table for quick responses
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  shortcut TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for message_templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for message_templates
CREATE POLICY "Users can view own templates"
ON public.message_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
ON public.message_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON public.message_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON public.message_templates FOR DELETE
USING (auth.uid() = user_id);

-- Create conversation_tags junction table
CREATE TABLE IF NOT EXISTS public.conversation_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, tag_id)
);

-- Enable RLS for conversation_tags
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_tags
CREATE POLICY "Users can view own conversation tags"
ON public.conversation_tags FOR SELECT
USING (EXISTS (
  SELECT 1 FROM conversations WHERE conversations.id = conversation_tags.conversation_id AND conversations.user_id = auth.uid()
));

CREATE POLICY "Users can create conversation tags"
ON public.conversation_tags FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations WHERE conversations.id = conversation_tags.conversation_id AND conversations.user_id = auth.uid()
));

CREATE POLICY "Users can delete conversation tags"
ON public.conversation_tags FOR DELETE
USING (EXISTS (
  SELECT 1 FROM conversations WHERE conversations.id = conversation_tags.conversation_id AND conversations.user_id = auth.uid()
));