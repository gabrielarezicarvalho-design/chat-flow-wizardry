import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useAgentConnections = () => {
  const { data: connections, isLoading, refetch } = useQuery({
    queryKey: ['agent-connections'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // First, fetch connections assigned to this user via user_connections table
      const { data: assignedConnections, error: assignedError } = await supabase
        .from('user_connections')
        .select(`
          connection_id,
          connections (
            id,
            name,
            status,
            platform,
            instance_id,
            token,
            environment,
            base_url,
            created_at
          )
        `)
        .eq('user_id', user.id);
      
      if (assignedError) throw assignedError;
      
      // Also fetch connections owned by this user (they are the owner)
      const { data: ownedConnections, error: ownedError } = await supabase
        .from('connections')
        .select(`
          id,
          name,
          status,
          platform,
          instance_id,
          token,
          environment,
          base_url,
          created_at
        `)
        .eq('user_id', user.id);
      
      if (ownedError) throw ownedError;
      
      // Combine both lists - assigned connections and owned connections
      const assignedList = assignedConnections?.map((uc: any) => uc.connections).filter(Boolean) || [];
      const ownedList = ownedConnections || [];
      
      // Merge and deduplicate by id
      const allConnections = [...ownedList, ...assignedList];
      const uniqueConnections = allConnections.filter((conn, index, self) => 
        index === self.findIndex((c) => c.id === conn.id)
      );
      
      // Check real status for each connection that has token
      const connectionsWithRealStatus = await Promise.all(
        uniqueConnections.map(async (conn: any) => {
          if (conn.token && conn.status !== 'connected') {
            // Try to check real status
            try {
              const { data: statusData } = await supabase.functions.invoke('wa-status-instance', {
                body: { 
                  token: conn.token, 
                  environment: conn.environment || 'TESTE'
                }
              });
              
              if (statusData?.success && statusData?.connected) {
                // Update connection status in database
                await supabase
                  .from('connections')
                  .update({ status: 'connected' })
                  .eq('id', conn.id);
                
                return { ...conn, status: 'connected' };
              }
            } catch (e) {
              console.error('Error checking connection status:', e);
            }
          }
          return conn;
        })
      );
      
      return connectionsWithRealStatus;
    },
    refetchInterval: 30000, // Refetch every 30 seconds to keep status updated
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