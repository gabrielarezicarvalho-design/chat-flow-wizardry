import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Building2, Users, RefreshCw } from "lucide-react";

export function AdminRelatorios() {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalProfiles: 0,
    totalConnections: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [companiesRes, profilesRes, connectionsRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("connections").select("id", { count: "exact", head: true })
      ]);
      
      setStats({
        totalCompanies: companiesRes.count || 0,
        totalProfiles: profilesRes.count || 0,
        totalConnections: connectionsRes.count || 0
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    { title: "Empresas por Plano", description: "Distribuição de empresas por tipo de plano" },
    { title: "Usuários por Empresa", description: "Quantidade de usuários cadastrados" },
    { title: "Conexões Ativas", description: "WhatsApp conectados por empresa" },
    { title: "Departamentos", description: "Estrutura organizacional" }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalCompanies}</p>
              <p className="text-xs text-slate-400">Total de Empresas</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalProfiles}</p>
              <p className="text-xs text-slate-400">Total de Usuários</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalConnections}</p>
              <p className="text-xs text-slate-400">Conexões WhatsApp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Relatórios Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
