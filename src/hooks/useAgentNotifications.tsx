import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getGlobalNotificationSound } from './useNotificationSound';

export const useAgentNotifications = () => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to messages for conversations assigned to this agent
    const channel = supabase
      .channel(`agent-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload: any) => {
          const message = payload.new;
          
          // Only notify for received messages (not sent by us)
          if (!message.recebido) return;

          // Check if this conversation is assigned to this agent
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, user_name, assigned_agent, user_id')
            .eq('id', message.id_da_conversa)
            .single();

          if (!conversation) return;

          // Check if assigned to this agent OR if agent owns this conversation via user_connections
          const isAssigned = conversation.assigned_agent === user.id;
          
          // Check if agent has access via user_connections
          const { data: userConnection } = await supabase
            .from('user_connections')
            .select('id')
            .eq('user_id', user.id)
            .single();

          const hasAccess = isAssigned || userConnection;

          if (hasAccess) {
            // Play notification sound
            try {
              const playSound = getGlobalNotificationSound();
              playSound();
            } catch (e) {
              console.error('Sound error:', e);
            }

            // Show toast notification
            const contactName = conversation.user_name || 'Contato';
            const messagePreview = message.conteudo?.substring(0, 50) || 'Nova mensagem';
            
            toast.info(`${contactName}: ${messagePreview}${message.conteudo?.length > 50 ? '...' : ''}`, {
              description: 'Clique para ver a conversa',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);
};
