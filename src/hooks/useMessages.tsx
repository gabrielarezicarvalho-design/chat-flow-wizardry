import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { getGlobalNotificationSound } from './useNotificationSound';
import { supabase } from '@/integrations/supabase/client';

// TRUE SINGLETON - never cleaned up during app lifetime
let globalChannelInstance: any = null;
let isInitializing = false;

const initGlobalChannel = (getQueryClient: () => any) => {
  if (globalChannelInstance || isInitializing) {
    return;
  }
  
  isInitializing = true;
  console.log('📡 [Global] Initializing PERMANENT global channel');

  globalChannelInstance = supabase
    .channel('global_realtime_permanent')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages'
      },
      (payload: any) => {
        const qc = getQueryClient();
        if (!qc) return;
        
        const conversationId = payload.new?.conversation_id || payload.old?.conversation_id;
        if (!conversationId) return;

        if (payload.eventType === 'INSERT') {
          console.log('⚡ [Realtime] NOVA MENSAGEM:', payload.new?.id);
          
          if (payload.new?.sender_type === 'contact') {
            try {
              const playSound = getGlobalNotificationSound();
              playSound();
            } catch (e) {
              console.error('Sound error:', e);
            }
          }
          
          qc.setQueryData(['messages', conversationId], (old: any[] = []) => {
            if (!old) return [payload.new];
            if (old.some((m: any) => m.id === payload.new.id)) return old;
            return [...old, payload.new].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          
          // Update ALL conversation query caches (with or without companyId)
          qc.setQueriesData({ queryKey: ['conversations'] }, (old: any[] | undefined) => {
            if (!old || !Array.isArray(old)) return old;
            return old.map((conv: any) => {
              if (conv.id === conversationId) {
                return {
                  ...conv,
                  last_message: payload.new.content,
                  updated_at: payload.new.created_at,
                  last_message_at: payload.new.created_at
                };
              }
              return conv;
            }).sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
        } else if (payload.eventType === 'UPDATE') {
          qc.setQueryData(['messages', conversationId], (old: any[] = []) => {
            return old.map((m: any) => m.id === payload.new.id ? payload.new : m);
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations'
      },
      (payload: any) => {
        const qc = getQueryClient();
        if (!qc) return;
        
        if (payload.eventType === 'INSERT') {
          console.log('⚡ [Realtime] NOVA CONVERSA');
          qc.invalidateQueries({ queryKey: ['conversations'] });
        } else if (payload.eventType === 'UPDATE') {
          qc.setQueriesData({ queryKey: ['conversations'] }, (old: any[] | undefined) => {
            if (!old || !Array.isArray(old)) return old;
            return old.map((conv: any) => 
              conv.id === payload.new.id ? { ...conv, ...payload.new } : conv
            );
          });
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 [Global] Channel status:', status);
      isInitializing = false;
    });
};

export const useMessages = (conversationId?: string) => {
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await (supabase
        .from('messages')
        .select('*') as any)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  const addMessageToCache = useCallback((newMessage: any) => {
    queryClient.setQueryData(['messages', conversationId], (old: any[] = []) => {
      if (old.some((m: any) => m.id === newMessage.id)) return old;
      return [...old, newMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, [conversationId, queryClient]);

  return {
    messages: messages || [],
    isLoading,
    addMessageToCache
  };
};

// Global hook - initializes singleton once
export const useGlobalMessages = () => {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    initGlobalChannel(() => queryClientRef.current);
    // No cleanup - channel persists for app lifetime
  }, []);
};
