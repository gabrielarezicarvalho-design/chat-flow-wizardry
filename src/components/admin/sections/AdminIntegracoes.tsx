import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plug, MessageSquare, Webhook, Cloud, RefreshCw, CheckCircle, XCircle, 
  Key, Settings, Building2, Loader2
} from "lucide-react";

interface AdminConnection {
  id: string;
  name: string;
  platform: string;
  status: string | null;
  environment: string;
  user_id: string;
  created_at: string;
  company_name: string | null;
}

export function AdminIntegracoes() {
  const [searchTerm, setSearchTerm] = useState("");

  // Usar função RPC que bypassa RLS
  const { data: connections = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-all-connections'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_connections');
      if (error) {
        console.error("Error fetching connections:", error);
        throw error;
      }
      return (data || []) as AdminConnection[];
    },
    refetchInterval: 30000,
  });

  const connectedCount = connections.filter(c => c.status === "connected").length;
  const disconnectedCount = connections.filter(c => c.status !== "connected").length;

  const integrationServices = [
    {
      name: "WhatsApp Cloud API",
      icon: MessageSquare,
      status: "configured",
      description: "Conexão com Meta Business Platform",
      color: "text-emerald-400"
    },
    {
      name: "Webhooks",
      icon: Webhook,
      status: "active",
      description: "Endpoints de recebimento de eventos",
      color: "text-cyan-400"
    },
    {
      name: "Meta Tokens",
      icon: Key,
      status: "configured",
      description: "Tokens de autenticação Meta",
      color: "text-purple-400"
    },
    {
      name: "OpenRouter API",
      icon: Cloud,
      status: "configured",
      description: "Modelos de IA para agentes",
      color: "text-amber-400"
    }
  ];

  // Filter connections
  const filteredConnections = connections.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrações</h1>
          <p className="text-slate-400">APIs, Webhooks e conexões externas</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{connectedCount}</p>
              <p className="text-xs text-slate-400">Conexões Ativas</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{disconnectedCount}</p>
              <p className="text-xs text-slate-400">Desconectadas</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Plug className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{connections.length}</p>
              <p className="text-xs text-slate-400">Total de Conexões</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Services */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Serviços de Integração</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrationServices.map((service) => (
            <div 
              key={service.name} 
              className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center`}>
                  <service.icon className={`h-6 w-6 ${service.color}`} />
                </div>
                <div>
                  <p className="font-medium text-white">{service.name}</p>
                  <p className="text-sm text-slate-400">{service.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  {service.status === "configured" ? "Configurado" : "Ativo"}
                </Badge>
                <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connections Table */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Conexões WhatsApp (Global)</h2>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
              <p className="text-slate-400 mt-2">Carregando conexões...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhuma conexão encontrada no sistema
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Nome</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Empresa</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Plataforma</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Ambiente</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-white">{conn.name}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-300">{conn.company_name || "Sem empresa"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className="bg-emerald-500/20 text-emerald-400">{conn.platform}</Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300">{conn.environment}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          conn.status === "connected" ? "bg-emerald-500" : "bg-red-500"
                        }`} />
                        <span className={conn.status === "connected" ? "text-emerald-400" : "text-red-400"}>
                          {conn.status === "connected" ? "Conectado" : "Desconectado"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
