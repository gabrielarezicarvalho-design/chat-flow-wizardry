import { useState, useEffect } from 'react';
import { X, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const MultiSessionAlert = () => {
  const { user, session } = useAuth();
  const [sessionCount, setSessionCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!user || !session) return;

    const checkSessions = async () => {
      // Use Supabase realtime presence to track active sessions
      const channel = supabase.channel(`user-presence-${user.id}`, {
        config: {
          presence: {
            key: session.access_token.substring(0, 20), // Unique key per session
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setSessionCount(count);
          setShowAlert(count > 1);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
              device: navigator.userAgent.substring(0, 50),
            });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = checkSessions();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [user, session]);

  const handleLogoutOthers = async () => {
    if (!session) return;
    
    setIsLoggingOut(true);
    try {
      // Sign out all other sessions except current one
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      
      if (error) throw error;
      
      toast.success('Outros dispositivos foram desconectados');
      setShowAlert(false);
    } catch (error: any) {
      toast.error('Erro ao desconectar outros dispositivos');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!showAlert || sessionCount <= 1) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
          <Monitor className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Você está conectado em múltiplos dispositivos.
          </p>
          <button
            onClick={handleLogoutOthers}
            disabled={isLoggingOut}
            className="text-sm text-blue-100 hover:text-white underline mt-1 disabled:opacity-50"
          >
            {isLoggingOut ? 'Desconectando...' : 'Clique aqui para deslogar dos demais dispositivos'}
          </button>
        </div>
        <button
          onClick={() => setShowAlert(false)}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
