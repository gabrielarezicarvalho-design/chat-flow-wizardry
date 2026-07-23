
-- =========== Tables first (no policies yet) ===========
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT,
  type TEXT NOT NULL DEFAULT 'private' CHECK (type IN ('private','group')),
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_room ON public.chat_participants(room_id);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','file','audio')),
  file_url TEXT,
  file_name TEXT,
  reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id, created_at DESC);

CREATE TABLE public.chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE public.chat_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);
CREATE INDEX idx_chat_mentions_user ON public.chat_mentions(user_id);

CREATE TABLE public.internal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL,
  created_by UUID NOT NULL,
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_internal_tasks_assigned ON public.internal_tasks(assigned_to);

-- =========== Grants ===========
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_mentions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_tasks TO authenticated;
GRANT ALL ON public.chat_rooms, public.chat_participants, public.chat_messages,
              public.chat_reactions, public.chat_mentions, public.internal_tasks
       TO service_role;

-- =========== Helper (after chat_participants exists) ===========
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = _room_id AND user_id = _user_id
  )
$$;

-- =========== Enable RLS ===========
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_tasks ENABLE ROW LEVEL SECURITY;

-- =========== Policies: chat_rooms ===========
CREATE POLICY "Users see rooms they participate in"
  ON public.chat_rooms FOR SELECT TO authenticated
  USING (public.is_room_participant(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Authenticated can create rooms"
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Participants can update rooms"
  ON public.chat_rooms FOR UPDATE TO authenticated
  USING (public.is_room_participant(id, auth.uid()))
  WITH CHECK (public.is_room_participant(id, auth.uid()));
CREATE POLICY "Creator can delete room"
  ON public.chat_rooms FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- =========== Policies: chat_participants ===========
CREATE POLICY "Users see participants of their rooms"
  ON public.chat_participants FOR SELECT TO authenticated
  USING (public.is_room_participant(room_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Users can add participants to rooms"
  ON public.chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_room_participant(room_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid())
  );
CREATE POLICY "Users update own participant row"
  ON public.chat_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Leave or admin remove"
  ON public.chat_participants FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_participants p
      WHERE p.room_id = chat_participants.room_id
        AND p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- =========== Policies: chat_messages ===========
CREATE POLICY "Participants see room messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_room_participant(room_id, auth.uid()));
CREATE POLICY "Participants send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_room_participant(room_id, auth.uid()));
CREATE POLICY "Participants can update (pin)"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (public.is_room_participant(room_id, auth.uid()))
  WITH CHECK (public.is_room_participant(room_id, auth.uid()));
CREATE POLICY "Sender can delete own message"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- =========== Policies: chat_reactions ===========
CREATE POLICY "See reactions in accessible rooms"
  ON public.chat_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id AND public.is_room_participant(m.room_id, auth.uid())
  ));
CREATE POLICY "React in accessible rooms"
  ON public.chat_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id AND public.is_room_participant(m.room_id, auth.uid())
  ));
CREATE POLICY "Remove own reaction"
  ON public.chat_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========== Policies: chat_mentions ===========
CREATE POLICY "See own mentions or as sender"
  ON public.chat_mentions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  ));
CREATE POLICY "Sender inserts mentions"
  ON public.chat_mentions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  ));
CREATE POLICY "Delete own mentions"
  ON public.chat_mentions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========== Policies: internal_tasks ===========
CREATE POLICY "See assigned or created tasks"
  ON public.internal_tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Create tasks"
  ON public.internal_tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update own tasks"
  ON public.internal_tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid())
  WITH CHECK (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Creator deletes tasks"
  ON public.internal_tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- =========== updated_at triggers ===========
CREATE TRIGGER trg_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_internal_tasks_updated_at BEFORE UPDATE ON public.internal_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== Realtime ===========
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_tasks;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
