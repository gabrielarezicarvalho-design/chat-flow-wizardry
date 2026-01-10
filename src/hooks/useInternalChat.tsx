import { useState } from 'react';
import { useAuth } from './useAuth';

// Hook simplificado - tabelas de chat interno não existem no schema atual
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
  const [rooms] = useState<ChatRoom[]>([]);
  const [messages] = useState<ChatMessage[]>([]);
  const [tasks] = useState<InternalTask[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isLoading] = useState(false);

  const createRoom = {
    mutate: (_data: { name?: string; type: 'private' | 'group'; participantIds: string[] }) => {
      console.log('Chat interno não implementado - tabelas não existem', user?.id);
    },
    mutateAsync: async (_data: { name?: string; type: 'private' | 'group'; participantIds: string[] }) => {
      console.log('Chat interno não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  const sendMessage = {
    mutate: (_data: { roomId: string; content: string; type?: string; replyTo?: string }) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_data: { roomId: string; content: string; type?: string; replyTo?: string }) => {
      console.log('Chat interno não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  const deleteMessage = {
    mutate: (_messageId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_messageId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    isPending: false
  };

  const addReaction = {
    mutate: (_data: { messageId: string; emoji: string }) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_data: { messageId: string; emoji: string }) => {
      console.log('Chat interno não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  const removeReaction = {
    mutate: (_reactionId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_reactionId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    isPending: false
  };

  const createTask = {
    mutate: (_data: Partial<InternalTask>) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_data: Partial<InternalTask>) => {
      console.log('Chat interno não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  const updateTask = {
    mutate: (_data: { id: string; updates: Partial<InternalTask> }) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_data: { id: string; updates: Partial<InternalTask> }) => {
      console.log('Chat interno não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  const deleteTask = {
    mutate: (_taskId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_taskId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    isPending: false
  };

  const pinMessage = {
    mutate: (_messageId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
    },
    mutateAsync: async (_messageId: string) => {
      console.log('Chat interno não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  const uploadFile = async (_file: File, _roomId: string) => {
    console.log('Chat interno não implementado - tabelas não existem');
    return null;
  };

  return {
    rooms,
    messages,
    tasks,
    selectedRoom,
    setSelectedRoom,
    roomsLoading: isLoading,
    messagesLoading: isLoading,
    tasksLoading: isLoading,
    createRoom,
    sendMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    createTask,
    updateTask,
    deleteTask,
    pinMessage,
    uploadFile,
  };
};