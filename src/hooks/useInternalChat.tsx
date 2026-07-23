import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';


// ============ Types ============
export interface ChatProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  is_online?: boolean | null;
}

export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at?: string | null;
  profile?: ChatProfile;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  type: 'text' | 'image' | 'file' | 'audio';
  file_url: string | null;
  file_name: string | null;
  reply_to: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  sender?: ChatProfile;
  reactions?: ChatReaction[];
  reply_message?: ChatMessage;
}

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChatMention {
  id: string;
  message_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  company_id: string | null;
  name: string | null;
  type: 'private' | 'group';
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface InternalTask {
  id: string;
  room_id: string | null;
  message_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  due_date: string | null;
  reminder_at: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  assignee?: ChatProfile;
}

// Cast helper – Supabase types are regenerated after migration; keeps TS calm meanwhile.
const db = supabase as any;

// ============ Hook: colleagues in same company ============
export const useCompanyUsers = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['company-users', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ChatProfile[]> => {
      const { data: me } = await db
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle();
      const companyId = me?.company_id;
      const query = db
        .from('profiles')
        .select('id, full_name, username, is_online')
        .neq('id', user!.id)
        .order('full_name', { ascending: true });
      const { data, error } = companyId
        ? await query.eq('company_id', companyId)
        : await query.is('company_id', null);
      if (error) throw error;
      return (data ?? []) as ChatProfile[];
    },
  });
};

// ============ Main hook ============
export const useInternalChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);

  // ---- Rooms (with participants + last message + unread count) ----
  const roomsQuery = useQuery({
    queryKey: ['chat-rooms', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ChatRoom[]> => {
      // Rooms I participate in (with my last_read_at)
      const { data: parts, error: pErr } = await db
        .from('chat_participants')
        .select('room_id, last_read_at')
        .eq('user_id', userId);
      if (pErr) throw pErr;
      const roomIds = (parts ?? []).map((p: any) => p.room_id);
      if (roomIds.length === 0) return [];
      const lastReadMap = new Map<string, string | null>(
        (parts ?? []).map((p: any) => [p.room_id as string, p.last_read_at as string | null])
      );

      const { data: rooms, error: rErr } = await db
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds)
        .order('updated_at', { ascending: false });
      if (rErr) throw rErr;

      // Participants + profiles
      const { data: allParts } = await db
        .from('chat_participants')
        .select('*')
        .in('room_id', roomIds);

      const userIds = Array.from(
        new Set((allParts ?? []).map((p: any) => p.user_id as string))
      );
      const { data: profs } = userIds.length
        ? await db
            .from('profiles')
            .select('id, full_name, username, is_online')
            .in('id', userIds)
        : { data: [] as ChatProfile[] };
      const profMap = new Map<string, ChatProfile>(
        (profs ?? []).map((p: any) => [p.id as string, p as ChatProfile])
      );

      // Last message per room + unread count
      const { data: lastMsgs } = await db
        .from('chat_messages')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });
      const lastMsgMap = new Map<string, ChatMessage>();
      const unreadMap = new Map<string, number>();
      for (const m of (lastMsgs ?? []) as ChatMessage[]) {
        if (!lastMsgMap.has(m.room_id)) lastMsgMap.set(m.room_id, m);
        const lastRead = lastReadMap.get(m.room_id);
        if (m.sender_id !== userId && (!lastRead || new Date(m.created_at) > new Date(lastRead))) {
          unreadMap.set(m.room_id, (unreadMap.get(m.room_id) ?? 0) + 1);
        }
      }

      return (rooms ?? []).map((r: any) => {
        const roomParts = (allParts ?? [])
          .filter((p: any) => p.room_id === r.id)
          .map((p: any) => ({ ...p, profile: profMap.get(p.user_id) }));
        return {
          ...r,
          participants: roomParts,
          last_message: lastMsgMap.get(r.id),
          unread_count: unreadMap.get(r.id) ?? 0,
        } as ChatRoom;
      });
    },
  });


  // ---- Messages of selected room ----
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', selectedRoom?.id],
    enabled: !!selectedRoom?.id,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await db
        .from('chat_messages')
        .select('*')
        .eq('room_id', selectedRoom!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const msgs = (data ?? []) as ChatMessage[];

      // Fetch parents for replies (may reference messages outside current window)
      const replyIds = Array.from(
        new Set(msgs.map((m) => m.reply_to).filter(Boolean) as string[])
      );
      const missingReplyIds = replyIds.filter((id) => !msgs.some((m) => m.id === id));
      const { data: extraReplies } = missingReplyIds.length
        ? await db.from('chat_messages').select('*').in('id', missingReplyIds)
        : { data: [] as ChatMessage[] };
      const allForProfiles = [...msgs, ...((extraReplies ?? []) as ChatMessage[])];

      const senderIds = Array.from(new Set(allForProfiles.map((m) => m.sender_id)));
      const { data: profs } = senderIds.length
        ? await db
            .from('profiles')
            .select('id, full_name, username')
            .in('id', senderIds)
        : { data: [] as ChatProfile[] };
      const profMap = new Map<string, ChatProfile>(
        (profs ?? []).map((p: any) => [p.id as string, p as ChatProfile])
      );

      const parentMap = new Map<string, ChatMessage>();
      for (const m of allForProfiles) {
        parentMap.set(m.id, { ...m, sender: profMap.get(m.sender_id) });
      }

      const msgIds = msgs.map((m) => m.id);
      const { data: reactions } = msgIds.length
        ? await db.from('chat_reactions').select('*').in('message_id', msgIds)
        : { data: [] as ChatReaction[] };
      const rxMap = new Map<string, ChatReaction[]>();
      for (const r of (reactions ?? []) as ChatReaction[]) {
        const arr = rxMap.get(r.message_id) ?? [];
        arr.push(r);
        rxMap.set(r.message_id, arr);
      }

      return msgs.map((m) => ({
        ...m,
        sender: profMap.get(m.sender_id),
        reactions: rxMap.get(m.id) ?? [],
        reply_message: m.reply_to ? parentMap.get(m.reply_to) : undefined,
      }));
    },
  });


  // ---- Tasks visible to me ----
  const tasksQuery = useQuery({
    queryKey: ['internal-tasks', userId],
    enabled: !!userId,
    queryFn: async (): Promise<InternalTask[]> => {
      const { data, error } = await db
        .from('internal_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const tasks = (data ?? []) as InternalTask[];
      const ids = Array.from(new Set(tasks.map((t) => t.assigned_to)));
      const { data: profs } = ids.length
        ? await db
            .from('profiles')
            .select('id, full_name, username')
            .in('id', ids)
        : { data: [] as ChatProfile[] };
      const profMap = new Map<string, ChatProfile>(
        (profs ?? []).map((p: any) => [p.id as string, p as ChatProfile])
      );
      return tasks.map((t) => ({ ...t, assignee: profMap.get(t.assigned_to) }));
    },
  });



  // ---- Unread mentions per room ----
  const mentionsQuery = useQuery({
    queryKey: ['chat-unread-mentions', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data: mentions } = await db
        .from('chat_mentions')
        .select('message_id')
        .eq('user_id', userId);
      const msgIds = Array.from(new Set((mentions ?? []).map((m: any) => m.message_id)));
      if (!msgIds.length) return {};
      const { data: msgs } = await db
        .from('chat_messages')
        .select('id, room_id, created_at, sender_id')
        .in('id', msgIds);
      const { data: parts } = await db
        .from('chat_participants')
        .select('room_id, last_read_at')
        .eq('user_id', userId);
      const lastReadMap = new Map<string, string | null>(
        (parts ?? []).map((p: any) => [p.room_id, p.last_read_at])
      );
      const counts: Record<string, number> = {};
      for (const m of (msgs ?? []) as any[]) {
        if (m.sender_id === userId) continue;
        const lr = lastReadMap.get(m.room_id);
        if (!lr || new Date(m.created_at) > new Date(lr)) {
          counts[m.room_id] = (counts[m.room_id] ?? 0) + 1;
        }
      }
      return counts;
    },
  });



  // ---- Realtime ----
  useEffect(() => {
    if (!userId) return;
    // Unique channel name per effect run avoids supabase-js reusing a
    // still-subscribed channel (which makes `.on()` throw).
    const channelName = `internal-chat-${userId}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          const rid = (payload.new || payload.old)?.room_id;
          queryClient.invalidateQueries({ queryKey: ['chat-messages', rid] });
          queryClient.invalidateQueries({ queryKey: ['chat-rooms', userId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms' },
        () => queryClient.invalidateQueries({ queryKey: ['chat-rooms', userId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants' },
        () => queryClient.invalidateQueries({ queryKey: ['chat-rooms', userId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reactions' },
        (payload: any) => {
          queryClient.invalidateQueries({
            queryKey: ['chat-messages', payload.new?.message_id ?? payload.old?.message_id],
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'internal_tasks' },
        () => queryClient.invalidateQueries({ queryKey: ['internal-tasks', userId] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mentions', filter: `user_id=eq.${userId}` },
        async (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ['chat-unread-mentions', userId] });
          const messageId = payload.new?.message_id;
          if (!messageId) return;
          const { data: msg } = await db
            .from('chat_messages')
            .select('content, sender_id, room_id')
            .eq('id', messageId)
            .maybeSingle();
          if (!msg || msg.sender_id === userId) return;
          const { data: sender } = await db
            .from('profiles')
            .select('full_name, username')
            .eq('id', msg.sender_id)
            .maybeSingle();
          const name = sender?.full_name || sender?.username || 'Alguém';
          toast(`${name} mencionou você`, {
            description: (msg.content ?? '').slice(0, 120),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // ---- Mutations ----
  const createRoom = useMutation({
    mutationFn: async (data: {
      name?: string;
      type: 'private' | 'group';
      participantIds: string[];
    }) => {
      if (!userId) throw new Error('Não autenticado');

      // For private chats, reuse existing room if it already exists
      if (data.type === 'private' && data.participantIds.length === 1) {
        const other = data.participantIds[0];
        const { data: mine } = await db
          .from('chat_participants')
          .select('room_id')
          .eq('user_id', userId);
        const myRoomIds = (mine ?? []).map((p: any) => p.room_id);
        if (myRoomIds.length) {
          const { data: shared } = await db
            .from('chat_participants')
            .select('room_id, chat_rooms!inner(type)')
            .in('room_id', myRoomIds)
            .eq('user_id', other);
          const existing = (shared ?? []).find(
            (r: any) => r.chat_rooms?.type === 'private'
          );
          if (existing) return existing.room_id as string;
        }
      }

      const { data: me } = await db
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle();

      const { data: room, error } = await db
        .from('chat_rooms')
        .insert({
          name: data.name ?? null,
          type: data.type,
          created_by: userId,
          company_id: me?.company_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const rows = [
        { room_id: room.id, user_id: userId, role: 'admin' as const },
        ...data.participantIds
          .filter((id) => id !== userId)
          .map((id) => ({ room_id: room.id, user_id: id, role: 'member' as const })),
      ];
      const { error: pErr } = await db.from('chat_participants').insert(rows);
      if (pErr) throw pErr;
      return room.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', userId] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (data: {
      roomId: string;
      content: string;
      type?: 'text' | 'image' | 'file' | 'audio';
      replyTo?: string;
      fileUrl?: string;
      fileName?: string;
      mentions?: string[];
    }) => {
      if (!userId) throw new Error('Não autenticado');
      const { data: msg, error } = await db
        .from('chat_messages')
        .insert({
          room_id: data.roomId,
          sender_id: userId,
          content: data.content,
          type: data.type ?? 'text',
          reply_to: data.replyTo ?? null,
          file_url: data.fileUrl ?? null,
          file_name: data.fileName ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const mentionIds = Array.from(new Set((data.mentions ?? []).filter(Boolean)));
      if (mentionIds.length && msg?.id) {
        await db.from('chat_mentions').insert(
          mentionIds.map((uid) => ({ message_id: msg.id, user_id: uid }))
        );
      }
      return msg as ChatMessage;
    },
    onSuccess: (_msg, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', vars.roomId] });
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', userId] });
    },
  });


  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await db.from('chat_messages').delete().eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedRoom?.id] });
    },
  });

  const pinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { data: current } = await db
        .from('chat_messages')
        .select('is_pinned')
        .eq('id', messageId)
        .maybeSingle();
      const { error } = await db
        .from('chat_messages')
        .update({ is_pinned: !current?.is_pinned })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedRoom?.id] });
    },
  });

  const addReaction = useMutation({
    mutationFn: async (data: { messageId: string; emoji: string }) => {
      if (!userId) throw new Error('Não autenticado');
      const { error } = await db.from('chat_reactions').insert({
        message_id: data.messageId,
        user_id: userId,
        emoji: data.emoji,
      });
      if (error && !String(error.message).includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedRoom?.id] });
    },
  });

  const removeReaction = useMutation({
    mutationFn: async (reactionId: string) => {
      const { error } = await db.from('chat_reactions').delete().eq('id', reactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedRoom?.id] });
    },
  });

  const createTask = useMutation({
    mutationFn: async (data: Partial<InternalTask>) => {
      if (!userId) throw new Error('Não autenticado');
      const { data: me } = await db
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle();
      const { data: task, error } = await db
        .from('internal_tasks')
        .insert({
          title: data.title,
          description: data.description ?? null,
          assigned_to: data.assigned_to,
          created_by: userId,
          company_id: me?.company_id ?? null,
          room_id: data.room_id ?? null,
          message_id: data.message_id ?? null,
          due_date: data.due_date ?? null,
          reminder_at: data.reminder_at ?? null,
          status: data.status ?? 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return task as InternalTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-tasks', userId] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InternalTask> }) => {
      const { error } = await db
        .from('internal_tasks')
        .update(data.updates)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-tasks', userId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await db.from('internal_tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-tasks', userId] });
    },
  });

  const uploadFile = async (file: File, roomId: string) => {
    const ext = file.name.split('.').pop();
    const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('campaign-media').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('campaign-media').getPublicUrl(path);
    return { url: data.publicUrl, name: file.name };
  };

  const markAsRead = useMutation({
    mutationFn: async (roomId: string) => {
      if (!userId) return;
      const { error } = await db
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', userId] });
      queryClient.invalidateQueries({ queryKey: ['chat-unread-mentions', userId] });
    },
  });




  // Enrich rooms with a display name for private chats (the other person)
  const rooms = useMemo<ChatRoom[]>(() => {
    const list = roomsQuery.data ?? [];
    return list.map((r) => {
      if (r.type === 'private' && !r.name && r.participants) {
        const other = r.participants.find((p) => p.user_id !== userId);
        return { ...r, name: other?.profile?.full_name || other?.profile?.username || 'Conversa' };
      }
      return r;
    });
  }, [roomsQuery.data, userId]);

  return {
    rooms,
    roomsLoading: roomsQuery.isLoading,
    messages: messagesQuery.data ?? [],
    messagesLoading: messagesQuery.isLoading,
    tasks: tasksQuery.data ?? [],
    tasksLoading: tasksQuery.isLoading,
    selectedRoom,
    setSelectedRoom,
    createRoom,
    sendMessage,
    deleteMessage,
    pinMessage,
    addReaction,
    removeReaction,
    createTask,
    updateTask,
    deleteTask,
    uploadFile,
    markAsRead,
    unreadMentions: mentionsQuery.data ?? {},

  };

};
