-- Tabela de salas de chat (privado ou grupo)
CREATE TABLE public.internal_chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT NOT NULL DEFAULT 'private' CHECK (type IN ('private', 'group')),
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Participantes das salas
CREATE TABLE public.internal_chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.internal_chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Mensagens do chat
CREATE TABLE public.internal_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.internal_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio')),
  file_url TEXT,
  file_name TEXT,
  reply_to UUID REFERENCES public.internal_chat_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Menções em mensagens
CREATE TABLE public.internal_chat_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.internal_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Reações com emoji
CREATE TABLE public.internal_chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.internal_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Tarefas criadas no chat
CREATE TABLE public.internal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.internal_chat_rooms(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.internal_chat_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL,
  created_by UUID NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for internal_chat_rooms
CREATE POLICY "Users can view rooms they participate in"
ON public.internal_chat_rooms FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_participants
  WHERE room_id = internal_chat_rooms.id AND user_id = auth.uid()
));

CREATE POLICY "Admins can create rooms"
ON public.internal_chat_rooms FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Room admins can update rooms"
ON public.internal_chat_rooms FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_participants
  WHERE room_id = internal_chat_rooms.id AND user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Room admins can delete rooms"
ON public.internal_chat_rooms FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_participants
  WHERE room_id = internal_chat_rooms.id AND user_id = auth.uid() AND role = 'admin'
));

-- RLS Policies for internal_chat_participants
CREATE POLICY "Users can view participants of their rooms"
ON public.internal_chat_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_participants p
  WHERE p.room_id = internal_chat_participants.room_id AND p.user_id = auth.uid()
));

CREATE POLICY "Admins can add participants"
ON public.internal_chat_participants FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove participants"
ON public.internal_chat_participants FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for internal_chat_messages
CREATE POLICY "Users can view messages in their rooms"
ON public.internal_chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_participants
  WHERE room_id = internal_chat_messages.room_id AND user_id = auth.uid()
));

CREATE POLICY "Users can send messages to their rooms"
ON public.internal_chat_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.internal_chat_participants
  WHERE room_id = internal_chat_messages.room_id AND user_id = auth.uid()
) AND sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
ON public.internal_chat_messages FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "Room admins can pin messages"
ON public.internal_chat_messages FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_participants
  WHERE room_id = internal_chat_messages.room_id AND user_id = auth.uid() AND role = 'admin'
));

-- RLS Policies for internal_chat_mentions
CREATE POLICY "Users can view mentions in their rooms"
ON public.internal_chat_mentions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_messages m
  JOIN public.internal_chat_participants p ON p.room_id = m.room_id
  WHERE m.id = internal_chat_mentions.message_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create mentions"
ON public.internal_chat_mentions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.internal_chat_messages m
  JOIN public.internal_chat_participants p ON p.room_id = m.room_id
  WHERE m.id = internal_chat_mentions.message_id AND p.user_id = auth.uid()
));

-- RLS Policies for internal_chat_reactions
CREATE POLICY "Users can view reactions in their rooms"
ON public.internal_chat_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.internal_chat_messages m
  JOIN public.internal_chat_participants p ON p.room_id = m.room_id
  WHERE m.id = internal_chat_reactions.message_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can add reactions"
ON public.internal_chat_reactions FOR INSERT
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.internal_chat_messages m
  JOIN public.internal_chat_participants p ON p.room_id = m.room_id
  WHERE m.id = internal_chat_reactions.message_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can remove their reactions"
ON public.internal_chat_reactions FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for internal_tasks
CREATE POLICY "Users can view tasks assigned to them or created by them"
ON public.internal_tasks FOR SELECT
USING (assigned_to = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create tasks"
ON public.internal_tasks FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update tasks they created or are assigned to"
ON public.internal_tasks FOR UPDATE
USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Creators can delete their tasks"
ON public.internal_tasks FOR DELETE
USING (created_by = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE internal_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE internal_chat_reactions;

-- Create storage bucket for internal chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('internal-chat', 'internal-chat', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for internal chat bucket
CREATE POLICY "Authenticated users can upload to internal-chat"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'internal-chat' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view internal-chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'internal-chat' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'internal-chat' AND auth.uid()::text = (storage.foldername(name))[1]);