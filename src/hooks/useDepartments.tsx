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
            user_id
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

      // Buscar company_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId!)
        .single();

      const { data, error } = await supabase
        .from('departments')
        .insert([{ 
          ...newDepartment, 
          company_id: profile?.company_id || newDepartment.company_id 
        }])
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
    mutationFn: async ({ departmentId, userId }: { departmentId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('department_members')
        .insert([{ department_id: departmentId, user_id: userId }])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Membro adicionado ao departamento!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar membro');
    }
  });

  const removeMember = useMutation({
    mutationFn: async ({ departmentId, userId }: { departmentId: string; userId: string }) => {
      const { error } = await supabase
        .from('department_members')
        .delete()
        .eq('department_id', departmentId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Membro removido do departamento!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover membro');
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