import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from './useCompanyId';

export const useConversations = () => {
  const queryClient = useQueryClient();
  const { companyId, isLoadingCompany } = useCompanyId();

  // Realtime: manter contadores (Atendente/IA/URA) e status atualizados sem reload
  useEffect(() => {
    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations', companyId] });
          queryClient.invalidateQueries({ queryKey: ['chat-history'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, companyId]);


  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations', companyId],
    queryFn: async () => {
      console.log('🔄 [Conversations] Fetching...');
      let query = supabase
        .from('conversations')
        .select('*')
        .neq('status', 'closed')
        .order('updated_at', { ascending: false });
      
      // If user belongs to a company, only show that company's conversations
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      console.log('✅ [Conversations] Loaded:', data?.length);
      return data;
    },
    enabled: !isLoadingCompany,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

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
      queryClient.invalidateQueries({ queryKey: ['conversations', companyId] });
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar conversa');
    }
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id);
      
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
      }

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
    isLoading: isLoading || isLoadingCompany,
    updateConversation,
    deleteConversation,
    refetch
  };
};
