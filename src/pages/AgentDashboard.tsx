import { useState, useEffect } from "react";
import { useAgentConnections } from "@/hooks/useAgentConnections";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Circle, MessageSquare, RefreshCw, Wifi, WifiOff, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const AgentDashboard = () => {
  const { connections, isLoading, refetch } = useAgentConnections();
  const queryClient = useQueryClient();

  // Realtime: manter cards de conversas (abertas, atendidas hoje, por conexão) atualizados
  useEffect(() => {
    const channel = supabase
      .channel('agent-dashboard-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['agent-open-chats'] });
          queryClient.invalidateQueries({ queryKey: ['agent-attended-today'] });
          queryClient.invalidateQueries({ queryKey: ['conversation-counts-by-connection'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [quote, setQuote] = useState({ text: "", author: "" });
  const [agentStatus, setAgentStatus] = useState<'online' | 'paused' | 'offline'>('offline');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch open chats count (assigned to this agent)
  const { data: openChatsCount = 0 } = useQuery({
    queryKey: ['agent-open-chats', user?.id],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return 0;

      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .eq('assigned_to', currentUser.id);

      return count || 0;
    },
    refetchInterval: 10000,
    enabled: !!user?.id
  });

  // Fetch chats attended today by this agent
  const { data: attendedTodayCount = 0 } = useQuery({
    queryKey: ['agent-attended-today', user?.id],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', currentUser.id)
        .gte('updated_at', today.toISOString());

      return count || 0;
    },
    refetchInterval: 10000,
    enabled: !!user?.id
  });

  // Fetch conversation counts per connection
  const { data: conversationCounts = {} } = useQuery({
    queryKey: ['conversation-counts-by-connection'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data: conversations } = await supabase
        .from('conversations')
        .select('connection_id')
        .eq('status', 'active')
        .not('connection_id', 'is', null);

      if (!conversations) return {};

      const counts: Record<string, number> = {};
      conversations.forEach((conv: any) => {
        if (conv.connection_id) {
          counts[conv.connection_id] = (counts[conv.connection_id] || 0) + 1;
        }
      });
      return counts;
    },
    refetchInterval: 10000,
  });

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        // Use is_online field since profiles table doesn't have status column
        setAgentStatus(data.is_online ? 'online' : 'offline');
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Set greeting based on time
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) setGreeting("Bom dia");
    else if (hour >= 12 && hour < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");
  }, [currentTime]);

  // Motivational quotes
  useEffect(() => {
    const quotes = [
      { text: "A vida é curta demais para ser pequena.", author: "Benjamin Disraeli" },
      { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
      { text: "A única forma de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs" },
      { text: "Cada cliente é uma oportunidade de fazer a diferença.", author: "MarketFlow" },
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const handleStatusChange = async (status: 'online' | 'paused' | 'offline') => {
    if (!user?.id) return;
    try {
      const updateData = {
        is_online: status === 'online',
        last_seen_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setAgentStatus(status);
      const statusLabel = status === 'online' ? 'Online' : status === 'paused' ? 'Pausado' : 'Offline';
      toast.success(`Status alterado para ${statusLabel}`);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const handleRefreshConnections = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success("Conexões atualizadas!");
    } catch (error) {
      toast.error("Erro ao atualizar conexões");
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'connected' ? (
      <Wifi className="w-5 h-5 text-white" />
    ) : (
      <WifiOff className="w-5 h-5 text-white" />
    );
  };

  const totalConversations = Object.values(conversationCounts).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gerenciar filas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {greeting} {profile?.full_name?.split(' ')[0] || 'Agente'}! — {format(currentTime, 'HH:mm')}
          </p>
        </div>
        
        {/* Status buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{openChatsCount} em aberto</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">{attendedTodayCount} atendidos hoje</span>
          </div>
          
          <Button
            size="sm"
            variant={agentStatus === 'offline' ? 'default' : 'outline'}
            className={`rounded-full w-8 h-8 p-0 ${agentStatus === 'offline' ? 'bg-red-500 hover:bg-red-600 border-red-500' : 'border-red-500 text-red-500 hover:bg-red-50'}`}
            onClick={() => handleStatusChange('offline')}
            title="Offline"
          >
            <Circle className="w-3 h-3" fill={agentStatus === 'offline' ? 'white' : 'currentColor'} />
          </Button>
          <Button
            size="sm"
            variant={agentStatus === 'online' ? 'default' : 'outline'}
            className={`rounded-full w-8 h-8 p-0 ${agentStatus === 'online' ? 'bg-green-500 hover:bg-green-600 border-green-500' : 'border-green-500 text-green-500 hover:bg-green-50'}`}
            onClick={() => handleStatusChange('online')}
            title="Online"
          >
            <Circle className="w-3 h-3" fill={agentStatus === 'online' ? 'white' : 'currentColor'} />
          </Button>
          <Button
            size="sm"
            variant={agentStatus === 'paused' ? 'default' : 'outline'}
            className={`rounded-full w-8 h-8 p-0 ${agentStatus === 'paused' ? 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500' : 'border-yellow-500 text-yellow-500 hover:bg-yellow-50'}`}
            onClick={() => handleStatusChange('paused')}
            title="Pausado"
          >
            <Pause className="w-3 h-3" />
          </Button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshConnections}
            disabled={refreshing}
            className="rounded-full w-8 h-8 p-0"
            title="Atualizar conexões"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
            <p>Carregando conexões...</p>
          </div>
        ) : connections.length > 0 ? (
          connections.map((conn: any) => {
            const convCount = conversationCounts[conn.id] || 0;
            return (
              <div
                key={conn.id}
                className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(conn.status)}`}>
                  {getStatusIcon(conn.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">
                    {conn.instance_name?.toUpperCase() || 'Conexão'}
                  </h3>
                  <span className={`text-xs ${conn.status === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
                    {conn.status === 'connected' ? 'Conectado' : 
                     conn.status === 'disconnected' ? 'Desconectado' : 'Conectando...'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge 
                    variant={conn.status === 'connected' ? 'default' : 'destructive'}
                    className={`text-xs ${conn.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {conn.status === 'connected' ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {convCount > 0 && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {convCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma conexão encontrada</p>
            <p className="text-sm">As conexões configuradas pelo admin aparecerão aqui</p>
          </div>
        )}
      </div>

      {/* Motivational Quote Card */}
      <div className="bg-white rounded-lg p-6 border">
        <p className="text-gray-600 italic">"{quote.text}"</p>
        <p className="text-primary text-sm mt-2 font-medium">— {quote.author}</p>
      </div>

      {/* News Section */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="font-medium text-gray-900 mb-3">Novidades</h3>
        <p className="text-gray-500 text-sm">Nenhuma novidade para exibir.</p>
      </div>
    </div>
  );
};

export default AgentDashboard;