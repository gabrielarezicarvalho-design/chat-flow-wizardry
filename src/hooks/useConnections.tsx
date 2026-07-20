import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from './useCompanyId';

export const useConnections = () => {
  const queryClient = useQueryClient();
  const { companyId, isLoadingCompany } = useCompanyId();
  const client = supabase;

  const { data: connections = [], isLoading, isFetching } = useQuery({
    queryKey: ['connections', companyId],
    queryFn: async () => {
      let query = client
        .from('connections')
        .select('*')
        .order('created_at', { ascending: false });
      
      // If user belongs to a company, only show that company's connections
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !isLoadingCompany,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const createConnection = useMutation({
    mutationFn: async (newConnection: any) => {
      const { data: authData } = await client.auth.getUser();
      const userId = authData?.user?.id;

      const connectionData: any = {
        ...newConnection,
        user_id: userId || newConnection.user_id,
        instance_name: newConnection.instance_name || newConnection.name
      };
      
      if (companyId) connectionData.company_id = companyId;

      const { data, error } = await client
        .from('connections')
        .insert([connectionData])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Conexão criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar conexão');
    }
  });

  const updateConnection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await client
        .from('connections')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) {
        throw new Error('Conexão não encontrada para atualização');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Conexão atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar conexão');
    }
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('connections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Conexão excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir conexão');
    }
  });

  return {
    connections,
    isLoading: (isLoading || isLoadingCompany) && connections.length === 0,
    isFetching,
    createConnection,
    updateConnection,
    deleteConnection
  };
};
