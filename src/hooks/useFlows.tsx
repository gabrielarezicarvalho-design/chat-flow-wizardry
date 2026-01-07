import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useFlows = () => {
  const queryClient = useQueryClient();

  const { data: flows, isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar fluxos:', error);
        throw new Error(error.message || 'Erro ao carregar fluxos');
      }
      return data;
    }
  });

  const createFlow = useMutation({
    mutationFn: async (newFlow: any) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const { data, error } = await supabase
        .from('flows')
        .insert([{ ...newFlow, user_id: userId || newFlow.user_id }])
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao criar fluxo:', error);
        throw new Error(error.message || 'Erro ao criar fluxo');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Fluxo criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro na criação de fluxo:', error);
      toast.error(error.message || 'Erro ao criar fluxo. Tente novamente.');
    }
  });

  const updateFlow = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('flows')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao atualizar fluxo:', error);
        throw new Error(error.message || 'Erro ao atualizar fluxo');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Fluxo atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro na atualização de fluxo:', error);
      toast.error(error.message || 'Erro ao atualizar fluxo. Tente novamente.');
    }
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao excluir fluxo:', error);
        throw new Error(error.message || 'Erro ao excluir fluxo');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Fluxo excluído com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro na exclusão de fluxo:', error);
      toast.error(error.message || 'Erro ao excluir fluxo. Tente novamente.');
    }
  });

  return {
    flows: flows || [],
    isLoading,
    createFlow,
    updateFlow,
    deleteFlow
  };
};
