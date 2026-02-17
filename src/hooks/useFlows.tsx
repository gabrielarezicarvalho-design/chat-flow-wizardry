import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from './useCompanyId';

export const useFlows = () => {
  const queryClient = useQueryClient();
  const { companyId, isLoadingCompany } = useCompanyId();

  const { data: flows, isLoading } = useQuery({
    queryKey: ['flows', companyId],
    queryFn: async () => {
      let query = supabase
        .from('flows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message || 'Erro ao carregar fluxos');
      return data;
    },
    enabled: !isLoadingCompany,
  });

  const createFlow = useMutation({
    mutationFn: async (newFlow: any) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const flowData: any = { ...newFlow, user_id: userId || newFlow.user_id };
      if (companyId) flowData.company_id = companyId;

      const { data, error } = await supabase
        .from('flows')
        .insert([flowData])
        .select()
        .maybeSingle();
      
      if (error) throw new Error(error.message || 'Erro ao criar fluxo');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Fluxo criado com sucesso!');
    },
    onError: (error: any) => {
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
      
      if (error) throw new Error(error.message || 'Erro ao atualizar fluxo');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Fluxo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar fluxo. Tente novamente.');
    }
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message || 'Erro ao excluir fluxo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Fluxo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir fluxo. Tente novamente.');
    }
  });

  return {
    flows: flows || [],
    isLoading: isLoading || isLoadingCompany,
    createFlow,
    updateFlow,
    deleteFlow
  };
};
