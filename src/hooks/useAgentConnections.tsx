import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useAgentConnections = () => {
  const { data: connections, isLoading, refetch } = useQuery({
    queryKey: ['agent-connections'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch connections from connections table based on company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return [];

      const { data: companyConnections, error } = await supabase
        .from('connections')
        .select('*')
        .eq('company_id', profile.company_id);
      
      if (error) throw error;
      return companyConnections || [];
    },
    refetchInterval: 30000,
  });

  // Subscribe to real-time updates on connections
  useEffect(() => {
    const channel = supabase
      .channel('agent-connections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    connections: connections || [],
    isLoading,
    refetch
  };
};