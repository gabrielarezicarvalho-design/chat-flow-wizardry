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
          if (message.sender_type !== 'contact') return;

          // Check if this conversation is assigned to this agent
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, contact_name, assigned_to, user_id')
            .eq('id', message.conversation_id)
            .single();

          if (!conversation) return;

          // Check if assigned to this agent
          const isAssigned = conversation.assigned_to === user.id || conversation.user_id === user.id;

          if (isAssigned) {
            // Play notification sound
            try {
              const playSound = getGlobalNotificationSound();
              playSound();
            } catch (e) {
              console.error('Sound error:', e);
            }

            // Show toast notification
            const contactName = conversation.contact_name || 'Contato';
            const messagePreview = message.content?.substring(0, 50) || 'Nova mensagem';
            
            toast.info(`${contactName}: ${messagePreview}${message.content?.length > 50 ? '...' : ''}`, {
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