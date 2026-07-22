
-- =========================
-- Tables first (helper functions reference them)
-- =========================
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  name TEXT,
  type TEXT NOT NULL DEFAULT 'private' CHECK (type IN ('private','group')),
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_rooms_company ON public.chat_rooms(company_id);
CREATE INDEX idx_chat_rooms_created_by ON public.chat_rooms(created_by);

CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE (room_id, user_id)
);
CREATE INDEX idx_chat_participants_room ON public.chat_participants(room_id);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);

CREATE TABLE public.chat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX idx_chat_reactions_message ON public.chat_reactions(message_id);

CREATE TABLE public.chat_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
CREATE INDEX idx_chat_mentions_message ON public.chat_mentions(message_id);
CREATE INDEX idx_chat_mentions_user ON public.chat_mentions(user_id);

CREATE TABLE public.internal_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
CREATE INDEX idx_internal_tasks_created_by ON public.internal_tasks(created_by);
CREATE INDEX idx_internal_tasks_room ON public.internal_tasks(room_id);

-- =========================
-- GRANTs
-- =========================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_mentions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_tasks TO authenticated;
GRANT ALL ON public.chat_rooms, public.chat_participants, public.chat_messages,
             public.chat_reactions, public.chat_mentions, public.internal_tasks
      TO service_role;

-- =========================
-- Helper functions (after tables exist)
-- =========================
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = _room_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_room_admin(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE room_id = _room_id AND user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_room_creator(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = _room_id AND created_by = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_message_room(_message_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT room_id FROM public.chat_messages WHERE id = _message_id;
$$;

CREATE OR REPLACE FUNCTION public.bump_chat_room_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_rooms SET updated_at = now() WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

-- =========================
-- RLS
-- =========================
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_tasks ENABLE ROW LEVEL SECURITY;

-- chat_rooms
CREATE POLICY "chat_rooms_select_participant" ON public.chat_rooms FOR SELECT TO authenticated
  USING (public.is_room_participant(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "chat_rooms_insert_own" ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "chat_rooms_update_admin" ON public.chat_rooms FOR UPDATE TO authenticated
  USING (public.is_room_admin(id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_room_admin(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "chat_rooms_delete_creator" ON public.chat_rooms FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- chat_participants
CREATE POLICY "chat_participants_select" ON public.chat_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_participant(room_id, auth.uid()) OR public.is_room_creator(room_id, auth.uid()));
CREATE POLICY "chat_participants_insert" ON public.chat_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_room_creator(room_id, auth.uid()) OR public.is_room_admin(room_id, auth.uid()));
CREATE POLICY "chat_participants_update" ON public.chat_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_room_admin(room_id, auth.uid()) OR public.is_room_creator(room_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_room_admin(room_id, auth.uid()) OR public.is_room_creator(room_id, auth.uid()));
CREATE POLICY "chat_participants_delete" ON public.chat_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_room_admin(room_id, auth.uid()) OR public.is_room_creator(room_id, auth.uid()));

-- chat_messages
CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_room_participant(room_id, auth.uid()));
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_room_participant(room_id, auth.uid()));
CREATE POLICY "chat_messages_update" ON public.chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "chat_messages_delete" ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_room_admin(room_id, auth.uid()));

-- chat_reactions
CREATE POLICY "chat_reactions_select" ON public.chat_reactions FOR SELECT TO authenticated
  USING (public.is_room_participant(public.get_message_room(message_id), auth.uid()));
CREATE POLICY "chat_reactions_insert" ON public.chat_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_room_participant(public.get_message_room(message_id), auth.uid()));
CREATE POLICY "chat_reactions_delete" ON public.chat_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- chat_mentions
CREATE POLICY "chat_mentions_select" ON public.chat_mentions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_participant(public.get_message_room(message_id), auth.uid()));
CREATE POLICY "chat_mentions_insert" ON public.chat_mentions FOR INSERT TO authenticated
  WITH CHECK (public.is_room_participant(public.get_message_room(message_id), auth.uid()));
CREATE POLICY "chat_mentions_delete" ON public.chat_mentions FOR DELETE TO authenticated
  USING (public.is_room_participant(public.get_message_room(message_id), auth.uid()));

-- internal_tasks
CREATE POLICY "internal_tasks_select" ON public.internal_tasks FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (room_id IS NOT NULL AND public.is_room_participant(room_id, auth.uid()))
  );
CREATE POLICY "internal_tasks_insert" ON public.internal_tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "internal_tasks_update" ON public.internal_tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (created_by = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "internal_tasks_delete" ON public.internal_tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- =========================
-- Triggers
-- =========================
CREATE TRIGGER trg_chat_rooms_updated BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_messages_updated BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_internal_tasks_updated BEFORE UPDATE ON public.internal_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chat_messages_bump_room AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_chat_room_on_message();

-- =========================
-- Realtime
-- =========================
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_mentions REPLICA IDENTITY FULL;
ALTER TABLE public.internal_tasks REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_tasks;
