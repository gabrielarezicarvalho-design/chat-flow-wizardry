import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ChatRoom {
  id: string;
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

export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    username: string | null;
    is_online: boolean | null;
  };
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
  sender?: {
    id: string;
    full_name: string | null;
    username: string | null;
  };
  reactions?: ChatReaction[];
  mentions?: ChatMention[];
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
  assignee?: {
    id: string;
    full_name: string | null;
    username: string | null;
  };
}

export const useInternalChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all rooms user participates in
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['internal-chat-rooms'],
    queryFn: async () => {
      const { data: participantRooms, error: pError } = await supabase
        .from('internal_chat_participants')
        .select('room_id')
        .eq('user_id', user?.id);

      if (pError) throw pError;
      if (!participantRooms?.length) return [];

      const roomIds = participantRooms.map(p => p.room_id);

      const { data, error } = await supabase
        .from('internal_chat_rooms')
        .select('*')
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get participants for each room
      const roomsWithParticipants = await Promise.all(
        (data || []).map(async (room) => {
          const { data: participants } = await supabase
            .from('internal_chat_participants')
            .select('*')
            .eq('room_id', room.id);

          // Get profile for each participant
          const participantsWithProfile = await Promise.all(
            (participants || []).map(async (p) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, username, is_online')
                .eq('id', p.user_id)
                .single();
              return { ...p, profile } as ChatParticipant;
            })
          );

          // Get last message
          const { data: lastMsgData } = await supabase
            .from('internal_chat_messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          let last_message = undefined;
          if (lastMsgData && lastMsgData.length > 0) {
            const msg = lastMsgData[0];
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .eq('id', msg.sender_id)
              .single();
            last_message = { ...msg, sender: senderProfile } as ChatMessage;
          }

          return {
            ...room,
            type: room.type as 'private' | 'group',
            participants: participantsWithProfile,
            last_message
          } as ChatRoom;
        })
      );

      return roomsWithParticipants;
    },
    enabled: !!user?.id,
    staleTime: 30000
  });

  // Fetch messages for a specific room
  const useRoomMessages = (roomId: string | null) => {
    return useQuery({
      queryKey: ['internal-chat-messages', roomId],
      queryFn: async () => {
        if (!roomId) return [];

        const { data, error } = await supabase
          .from('internal_chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get sender profile and extras for each message
        const messagesWithExtras = await Promise.all(
          (data || []).map(async (msg) => {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .eq('id', msg.sender_id)
              .single();

            const { data: reactions } = await supabase
              .from('internal_chat_reactions')
              .select('*')
              .eq('message_id', msg.id);

            const { data: mentions } = await supabase
              .from('internal_chat_mentions')
              .select('*')
              .eq('message_id', msg.id);

            let reply_message = undefined;
            if (msg.reply_to) {
              const { data: replyData } = await supabase
                .from('internal_chat_messages')
                .select('*')
                .eq('id', msg.reply_to)
                .single();
              if (replyData) {
                const { data: replySender } = await supabase
                  .from('profiles')
                  .select('id, full_name, username')
                  .eq('id', replyData.sender_id)
                  .single();
                reply_message = { ...replyData, sender: replySender } as ChatMessage;
              }
            }

            return {
              ...msg,
              type: msg.type as 'text' | 'image' | 'file' | 'audio',
              sender: senderProfile,
              reactions: reactions || [],
              mentions: mentions || [],
              reply_message
            } as ChatMessage;
          })
        );

        return messagesWithExtras;
      },
      enabled: !!roomId,
      staleTime: 0
    });
  };

  // Create a new room (group or private)
  const createRoom = useMutation({
    mutationFn: async ({ name, type, participantIds, avatarUrl }: {
      name?: string;
      type: 'private' | 'group';
      participantIds: string[];
      avatarUrl?: string;
    }) => {
      // Create the room
      const { data: room, error: roomError } = await supabase
        .from('internal_chat_rooms')
        .insert({
          name: type === 'group' ? name : null,
          type,
          avatar_url: avatarUrl || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as admin
      const { error: creatorError } = await supabase
        .from('internal_chat_participants')
        .insert({
          room_id: room.id,
          user_id: user?.id,
          role: 'admin'
        });

      if (creatorError) throw creatorError;

      // Add other participants as members
      const participantInserts = participantIds
        .filter(id => id !== user?.id)
        .map(userId => ({
          room_id: room.id,
          user_id: userId,
          role: 'member' as const
        }));

      if (participantInserts.length > 0) {
        const { error: participantsError } = await supabase
          .from('internal_chat_participants')
          .insert(participantInserts);

        if (participantsError) throw participantsError;
      }

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chat-rooms'] });
      toast.success('Conversa criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar conversa: ' + error.message);
    }
  });

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async ({ roomId, content, type, fileUrl, fileName, replyTo, mentionIds }: {
      roomId: string;
      content?: string;
      type: 'text' | 'image' | 'file' | 'audio';
      fileUrl?: string;
      fileName?: string;
      replyTo?: string;
      mentionIds?: string[];
    }) => {
      const { data: message, error: msgError } = await supabase
        .from('internal_chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user?.id,
          content,
          type,
          file_url: fileUrl || null,
          file_name: fileName || null,
          reply_to: replyTo || null
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Add mentions if any
      if (mentionIds && mentionIds.length > 0) {
        const mentionInserts = mentionIds.map(userId => ({
          message_id: message.id,
          user_id: userId
        }));

        await supabase
          .from('internal_chat_mentions')
          .insert(mentionInserts);
      }

      // Update room's updated_at
      await supabase
        .from('internal_chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-chat-messages', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['internal-chat-rooms'] });
    }
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('internal_chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user?.id)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        // Remove reaction
        await supabase
          .from('internal_chat_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add reaction
        await supabase
          .from('internal_chat_reactions')
          .insert({
            message_id: messageId,
            user_id: user?.id,
            emoji
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chat-messages'] });
    }
  });

  // Pin/Unpin message
  const togglePin = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('internal_chat_messages')
        .update({ is_pinned: !isPinned })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chat-messages'] });
      toast.success('Mensagem atualizada!');
    }
  });

  // Create task
  const createTask = useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      assignedTo: string;
      dueDate?: string;
      reminderAt?: string;
      roomId?: string;
      messageId?: string;
    }) => {
      const { data, error } = await supabase
        .from('internal_tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          assigned_to: task.assignedTo,
          created_by: user?.id,
          due_date: task.dueDate || null,
          reminder_at: task.reminderAt || null,
          room_id: task.roomId || null,
          message_id: task.messageId || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
      toast.success('Tarefa criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    }
  });

  // Update task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'pending' | 'in_progress' | 'completed' }) => {
      const { error } = await supabase
        .from('internal_tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
      toast.success('Tarefa atualizada!');
    }
  });

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['internal-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_tasks')
        .select('*')
        .or(`assigned_to.eq.${user?.id},created_by.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get assignee profile for each task
      const tasksWithAssignee = await Promise.all(
        (data || []).map(async (task) => {
          const { data: assignee } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .eq('id', task.assigned_to)
            .single();
          return {
            ...task,
            status: task.status as 'pending' | 'in_progress' | 'completed',
            assignee
          } as InternalTask;
        })
      );
      
      return tasksWithAssignee;
    },
    enabled: !!user?.id
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('internal-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internal_chat_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['internal-chat-messages'] });
          queryClient.invalidateQueries({ queryKey: ['internal-chat-rooms'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internal_chat_reactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['internal-chat-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Add participants to group
  const addParticipants = useMutation({
    mutationFn: async ({ roomId, userIds }: { roomId: string; userIds: string[] }) => {
      const inserts = userIds.map(userId => ({
        room_id: roomId,
        user_id: userId,
        role: 'member' as const
      }));

      const { error } = await supabase
        .from('internal_chat_participants')
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chat-rooms'] });
      toast.success('Participantes adicionados!');
    }
  });

  // Remove participant from group
  const removeParticipant = useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: string; userId: string }) => {
      const { error } = await supabase
        .from('internal_chat_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-chat-rooms'] });
      toast.success('Participante removido!');
    }
  });

  return {
    rooms,
    roomsLoading,
    useRoomMessages,
    createRoom,
    sendMessage,
    toggleReaction,
    togglePin,
    createTask,
    updateTaskStatus,
    tasks,
    tasksLoading,
    addParticipants,
    removeParticipant,
    currentUserId: user?.id
  };
};

// Fetch all users for mentions and adding to groups
export const useAllUsers = () => {
  return useQuery({
    queryKey: ['all-users-for-chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, is_online')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    staleTime: 60000
  });
};
