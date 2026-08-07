import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Search, RefreshCw, Building2, MessageSquare, TrendingUp, Loader2 } from "lucide-react";

export function AdminAgentes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Placeholder - tabela de agentes será criada posteriormente
  const agents: any[] = [];
  const agentsByCompany: Record<string, any[]> = {};

  const totalAgents = 0;
  const activeAgents = 0;
  const totalConversationsToday = 0;
  const companiesWithAgents = 0;

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

      {/* Empty State */}
      <div className="p-8 text-center text-slate-500 bg-white/5 rounded-xl border border-white/10">
        <Bot className="h-12 w-12 mx-auto mb-4 text-slate-600" />
        <p className="text-lg font-medium text-slate-400">Nenhum agente cadastrado</p>
        <p className="text-sm text-slate-500 mt-1">A tabela de agentes será configurada em breve</p>
      </div>
    </div>
  );
}
