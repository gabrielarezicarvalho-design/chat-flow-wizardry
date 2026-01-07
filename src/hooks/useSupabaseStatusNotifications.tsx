import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSupabaseStatusNotifications = () => {
  const { user } = useAuth();
  const previousStatus = useRef<boolean>(true);
  const isFirstCheck = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }, []);

  const checkAllConnections = useCallback(async () => {
    if (!user) return;

    const connected = await checkConnection();

    // Skip notifications on first check
    if (isFirstCheck.current) {
      previousStatus.current = connected;
      isFirstCheck.current = false;
      return;
    }

    // Check for status changes and notify
    if (previousStatus.current !== connected) {
      if (connected) {
        toast.success('Conexão com Supabase restaurada', {
          description: 'A conexão com o banco de dados foi restabelecida.',
          duration: 5000,
        });
      } else {
        toast.error('Conexão com Supabase perdida', {
          description: 'Verifique sua conexão com a internet.',
          duration: 10000,
        });
      }
    }

    previousStatus.current = connected;
  }, [user, checkConnection]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkAllConnections();

    // Set up periodic checks every 30 seconds
    checkIntervalRef.current = setInterval(checkAllConnections, 30000);

    // Also check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAllConnections();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, checkAllConnections]);

  return {
    checkAllConnections,
  };
};
