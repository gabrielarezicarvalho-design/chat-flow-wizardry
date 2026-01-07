import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useConnections = () => {
  const queryClient = useQueryClient();
  // Always use main Supabase for connections - they are system-level resources
  const client = supabase;

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const { data, error } = await client
        .from('connections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createConnection = useMutation({
    mutationFn: async (newConnection: any) => {
      const { data: authData } = await client.auth.getUser();
      const userId = authData?.user?.id;

      const { data, error } = await client
        .from('connections')
        .insert([{ ...newConnection, user_id: userId || newConnection.user_id }])
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
    connections: connections || [],
    isLoading,
    createConnection,
    updateConnection,
    deleteConnection
  };
};
