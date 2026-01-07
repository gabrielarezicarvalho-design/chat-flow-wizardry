import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Search, RefreshCw, Building2, MessageSquare, TrendingUp, Loader2 } from "lucide-react";

interface AdminAgent {
  id: string;
  name: string;
  platform: string;
  status: string | null;
  model: string | null;
  conversations_today: number | null;
  avg_response_time: string | null;
  satisfaction: string | null;
  user_id: string;
  created_at: string;
  company_name: string | null;
}

export function AdminAgentes() {
  const [searchTerm, setSearchTerm] = useState("");

  // Usar função RPC que bypassa RLS
  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-all-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_agents');
      if (error) {
        console.error("Error fetching agents:", error);
        throw error;
      }
      return (data || []) as AdminAgent[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Group agents by company
  const agentsByCompany = agents.reduce((acc, agent) => {
    const companyName = agent.company_name || "Sem Empresa";
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(agent);
    return acc;
  }, {} as Record<string, AdminAgent[]>);

  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === "active").length;
  const totalConversationsToday = agents.reduce((sum, a) => sum + (a.conversations_today || 0), 0);
  const companiesWithAgents = Object.keys(agentsByCompany).length;

  const filteredCompanies = Object.entries(agentsByCompany).filter(([company]) =>
    company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes (Global)</h1>
          <p className="text-slate-400">Visão global de todos os agentes de todas as empresas</p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-white/10 text-slate-300 hover:text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalAgents}</p>
              <p className="text-xs text-slate-400">Total de Agentes</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-white">{activeAgents}</p>
              <p className="text-xs text-slate-400">Ativos</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalConversationsToday}</p>
              <p className="text-xs text-slate-400">Conversas Hoje</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{companiesWithAgents}</p>
              <p className="text-xs text-slate-400">Empresas com Agentes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white max-w-md"
        />
      </div>

      {/* Agents by Company */}
      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
          <p className="text-slate-400 mt-2">Carregando agentes...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          {agents.length === 0 ? "Nenhum agente cadastrado no sistema" : "Nenhum agente encontrado para a busca"}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCompanies.map(([company, companyAgents]) => (
            <div key={company} className="rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <h3 className="font-medium text-white">{company}</h3>
                  <Badge className="bg-slate-500/20 text-slate-300">
                    {companyAgents.length} agente(s)
                  </Badge>
                </div>
                <div className="text-sm text-slate-400">
                  {companyAgents.reduce((sum, a) => sum + (a.conversations_today || 0), 0)} conversas hoje
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {companyAgents.map((agent) => (
                  <div key={agent.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        agent.status === "active" ? "bg-emerald-500/20" : "bg-slate-500/20"
                      }`}>
                        <Bot className={`h-5 w-5 ${agent.status === "active" ? "text-emerald-400" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{agent.name}</p>
                        <p className="text-sm text-slate-400">{agent.model || "Sem modelo"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-white">{agent.conversations_today || 0}</p>
                        <p className="text-xs text-slate-500">Conversas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-white">{agent.avg_response_time || "—"}</p>
                        <p className="text-xs text-slate-500">Tempo Resp.</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-white">{agent.satisfaction || "—"}</p>
                        <p className="text-xs text-slate-500">Satisfação</p>
                      </div>
                      <Badge className={agent.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}>
                        {agent.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
