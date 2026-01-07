import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useDepartments = () => {
  const queryClient = useQueryClient();

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          department_members (
            id,
            agent_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createDepartment = useMutation({
    mutationFn: async (newDepartment: any) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const { data, error } = await supabase
        .from('departments')
        .insert([{ ...newDepartment, user_id: userId || newDepartment.user_id }])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Departamento criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar departamento');
    }
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Departamento atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar departamento');
    }
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Departamento excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir departamento');
    }
  });

  const addMember = useMutation({
    mutationFn: async ({ departmentId, agentId }: { departmentId: string; agentId: string }) => {
      const { data, error } = await supabase
        .from('department_members')
        .insert([{ department_id: departmentId, agent_id: agentId }])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Agente adicionado ao departamento!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar agente');
    }
  });

  const removeMember = useMutation({
    mutationFn: async ({ departmentId, agentId }: { departmentId: string; agentId: string }) => {
      const { error } = await supabase
        .from('department_members')
        .delete()
        .eq('department_id', departmentId)
        .eq('agent_id', agentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Agente removido do departamento!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover agente');
    }
  });

  return {
    departments: departments || [],
    isLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    addMember,
    removeMember
  };
};
