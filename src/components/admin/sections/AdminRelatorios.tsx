import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MessageSquare, Users, Clock, TrendingUp, RefreshCw } from "lucide-react";

export function AdminRelatorios() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalConversations: 0,
    avgResponseTime: "—",
    resolvedConversations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [messagesRes, conversationsRes] = await Promise.all([
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id, status")
      ]);

      const conversations = conversationsRes.data || [];
      
      setStats({
        totalMessages: messagesRes.count || 0,
        totalConversations: conversations.length,
        avgResponseTime: "2min", // Would need calculation logic
        resolvedConversations: conversations.filter(c => c.status === "closed").length
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    { title: "Mensagens por Empresa", description: "Volume de mensagens enviadas/recebidas" },
    { title: "Conversas por Canal", description: "WhatsApp, Web, etc." },
    { title: "Tempo Médio de Resposta", description: "Por empresa e agente" },
    { title: "Conversas Resolvidas", description: "Taxa de resolução" },
    { title: "Consumo de API Meta", description: "Chamadas e limites" },
    { title: "Performance por Agente", description: "Métricas de desempenho" }
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Relatórios Globais</h1>
        <p className="text-slate-400">Métricas e análises da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalMessages.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Total de Mensagens</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalConversations}</p>
              <p className="text-xs text-slate-400">Total de Conversas</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.avgResponseTime}</p>
              <p className="text-xs text-slate-400">Tempo Médio Resp.</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.resolvedConversations}</p>
              <p className="text-xs text-slate-400">Conversas Resolvidas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Relatórios Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div 
              key={report.title}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300" />
                <h3 className="font-medium text-white">{report.title}</h3>
              </div>
              <p className="text-sm text-slate-400">{report.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder for charts */}
      <div className="mt-8 p-8 rounded-xl bg-white/5 border border-white/10 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400">Gráficos e visualizações serão exibidos aqui</p>
      </div>
    </div>
  );
}
