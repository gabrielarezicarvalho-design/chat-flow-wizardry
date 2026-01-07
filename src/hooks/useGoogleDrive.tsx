import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export const useGoogleDrive = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: driveConnection, isLoading } = useQuery({
    queryKey: ['google-drive-connection', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: backups, isLoading: loadingBackups } = useQuery({
    queryKey: ['conversation-backups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('conversation_backups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const connectDrive = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('google-drive-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      
      return response.data.authUrl;
    },
    onSuccess: (authUrl) => {
      // Full page redirect to Google OAuth (goes through our callback to save tokens)
      window.location.href = authUrl;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao conectar Google Drive');
    },
  });

  const disconnectDrive = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('google_drive_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Google Drive desconectado');
      queryClient.invalidateQueries({ queryKey: ['google-drive-connection'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao desconectar');
    },
  });

  const runBackup = useMutation({
    mutationFn: async ({ month, testMode }: { month?: string; testMode?: boolean } = {}) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('google-drive-backup', {
        body: { 
          userId: user?.id,
          month: month || new Date().toISOString().slice(0, 7),
          testMode: testMode || false,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.testMode) {
        toast.success(`✅ Backup de teste criado! Verifique seu Google Drive.`);
      } else {
        toast.success(`Backup concluído! ${data.backedUp} conversas salvas.`);
      }
      queryClient.invalidateQueries({ queryKey: ['conversation-backups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao fazer backup');
    },
  });

  return {
    driveConnection,
    isConnected: !!driveConnection,
    isLoading,
    backups,
    loadingBackups,
    connectDrive,
    disconnectDrive,
    runBackup,
  };
};
