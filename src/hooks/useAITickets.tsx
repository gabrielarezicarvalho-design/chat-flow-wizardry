import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AITicket {
  id: string;
  user_id: string;
  conversation_id?: string;
  connection_id?: string;
  agent_id?: string;
  contact_name?: string;
  contact_phone: string;
  reason: string;
  dissatisfaction_level: string;
  best_contact_time?: string;
  ai_summary?: string;
  status: string;
  priority: string;
  notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export const useAITickets = () => {
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['ai-tickets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('ai_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AITicket[];
    }
  });

  const createTicket = useMutation({
    mutationFn: async (newTicket: Omit<AITicket, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { user_id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('ai_tickets')
        .insert([{ 
          contact_phone: newTicket.contact_phone,
          reason: newTicket.reason,
          contact_name: newTicket.contact_name,
          conversation_id: newTicket.conversation_id,
          connection_id: newTicket.connection_id,
          agent_id: newTicket.agent_id,
          dissatisfaction_level: newTicket.dissatisfaction_level || 'medium',
          best_contact_time: newTicket.best_contact_time,
          ai_summary: newTicket.ai_summary,
          status: newTicket.status || 'pending',
          priority: newTicket.priority || 'normal',
          notes: newTicket.notes,
          user_id: user.id 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tickets'] });
      toast.success('Chamado criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar chamado');
    }
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AITicket> }) => {
      const { data, error } = await supabase
        .from('ai_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tickets'] });
      toast.success('Chamado atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar chamado');
    }
  });

  const resolveTicket = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('ai_tickets')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          notes 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tickets'] });
      toast.success('Chamado resolvido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao resolver chamado');
    }
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_tickets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tickets'] });
      toast.success('Chamado excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir chamado');
    }
  });

  return {
    tickets: tickets || [],
    isLoading,
    createTicket,
    updateTicket,
    resolveTicket,
    deleteTicket
  };
};
