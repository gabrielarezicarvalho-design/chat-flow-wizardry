import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from './useCompanyId';

export const useAgents = () => {
  const queryClient = useQueryClient();
  const { companyId, isLoadingCompany } = useCompanyId();

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: async () => {
      let query = supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !isLoadingCompany,
  });

  const createAgent = useMutation({
    mutationFn: async (newAgent: any) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const agentData: any = { ...newAgent, user_id: userId || newAgent.user_id };
      if (companyId) agentData.company_id = companyId;

      const { data, error } = await supabase
        .from('agents')
        .insert([agentData])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agente criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar agente');
    }
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agente atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar agente');
    }
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agente excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir agente');
    }
  });

  const toggleStatus = useMutation({
    mutationFn: async (id: string) => {
      const agent = agents?.find(a => a.id === id);
      if (!agent) throw new Error('Agente não encontrado');

      const newStatus = agent.status === 'active' ? 'inactive' : 'active';
      
      const { data, error } = await supabase
        .from('agents')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success(`Agente ${data.status === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar status do agente');
    }
  });

  return {
    agents: agents || [],
    isLoading: isLoading || isLoadingCompany,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleStatus
  };
};
