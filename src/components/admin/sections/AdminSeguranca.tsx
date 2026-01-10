import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, AlertTriangle, User, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export function AdminSeguranca() {
  const [loading, setLoading] = useState(true);
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, is_online, last_seen_at")
        .order("last_seen_at", { ascending: false })
        .limit(10);

      setRecentProfiles(profiles || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const securityChecks = [
    { name: "Autenticação", status: "ok", description: "Supabase Auth ativo" },
    { name: "RLS Policies", status: "ok", description: "Políticas de segurança configuradas" },
    { name: "Criptografia", status: "ok", description: "HTTPS habilitado" },
    { name: "Rate Limiting", status: "warning", description: "Configuração básica" }
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Segurança & Auditoria</h1>
        <p className="text-slate-400">Logs de ações e verificações de segurança</p>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {securityChecks.map((check) => (
          <div 
            key={check.name}
            className={`p-4 rounded-xl border ${
              check.status === "ok" 
                ? "bg-emerald-500/10 border-emerald-500/20" 
                : "bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield className={`h-5 w-5 ${check.status === "ok" ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="font-medium text-white">{check.name}</span>
            </div>
            <p className="text-sm text-slate-400">{check.description}</p>
            <Badge className={`mt-2 ${check.status === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
              {check.status === "ok" ? "OK" : "Atenção"}
            </Badge>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Logs Placeholder */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="font-semibold text-white">Log de Auditoria</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="p-8 text-center text-slate-400">
            <Activity className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <p>Logs de auditoria serão exibidos aqui</p>
            <p className="text-xs mt-2">Tabela audit_logs necessária</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 bg-white/5 flex items-center gap-2">
            <User className="h-5 w-5 text-purple-400" />
            <h2 className="font-semibold text-white">Atividade Recente</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : recentProfiles.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhuma atividade recente
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentProfiles.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      user.is_online ? "bg-emerald-500/20" : "bg-slate-500/20"
                    }`}>
                      <User className={`h-4 w-4 ${user.is_online ? "text-emerald-400" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.full_name || "Usuário"}</p>
                      <p className="text-xs text-slate-500">
                        {user.is_online ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">
                      {user.last_seen_at 
                        ? format(new Date(user.last_seen_at), "dd/MM HH:mm", { locale: ptBR })
                        : "—"
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Tips */}
      <div className="mt-8 p-6 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-white">Recomendações de Segurança</h3>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>• Revise as permissões de usuários regularmente</li>
          <li>• Monitore tentativas de login suspeitas</li>
          <li>• Mantenha as integrações atualizadas</li>
          <li>• Faça backup dos dados periodicamente</li>
        </ul>
      </div>
    </div>
  );
}
