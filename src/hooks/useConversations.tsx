import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useConversations = () => {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('🔄 [Conversations] Fetching...');
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          leads (name, phone, avatar)
        `)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      console.log('✅ [Conversations] Loaded:', data?.length);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Real-time updates are handled by the global channel in useMessages.tsx
  // No need for a separate channel here - it was causing CHANNEL_ERROR

  const updateConversation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['conversations'], (old: any[] = []) => {
          return old.map((c: any) => c.id === data.id ? { ...c, ...data } : c);
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar conversa');
    }
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      // First remove conversation reference from ai_tickets
      await supabase
        .from('ai_tickets')
        .update({ conversation_id: null })
        .eq('conversation_id', id);

      // Delete conversation_tags
      await supabase
        .from('conversation_tags')
        .delete()
        .eq('conversation_id', id);

      // Delete all messages for this conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('id_da_conversa', id);
      
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        // Continue anyway - messages might not exist
      }

      // Then delete the conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(['conversations'], (old: any[] = []) => {
        return old.filter((c: any) => c.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      toast.success('Atendimento encerrado!');
    },
    onError: (error: any) => {
      console.error('Error closing conversation:', error);
      toast.error(error.message || 'Erro ao encerrar atendimento');
    }
  });

  return {
    conversations: conversations || [],
    isLoading,
    updateConversation,
    deleteConversation,
    refetch
  };
};
