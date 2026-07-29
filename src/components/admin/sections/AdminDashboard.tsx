import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, Users, MessageSquare, Zap, TrendingUp, 
  Activity, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  onlineUsers: number;
  totalConnections: number;
  connectedConnections: number;
  totalDepartments: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    onlineUsers: 0,
    totalConnections: 0,
    connectedConnections: 0,
    totalDepartments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        companiesRes,
        profilesRes,
        connectionsRes,
        departmentsRes
      ] = await Promise.all([
        supabase.from("companies").select("id, is_active"),
        supabase.from("profiles").select("id, is_online"),
        supabase.from("connections").select("id, status"),
        supabase.from("departments").select("id")
      ]);

      const companies = companiesRes.data || [];
      const profiles = profilesRes.data || [];
      const connections = connectionsRes.data || [];
      const departments = departmentsRes.data || [];

      setStats({
        totalCompanies: companies.length,
        activeCompanies: companies.filter(c => c.is_active).length,
        totalUsers: profiles.length,
        onlineUsers: profiles.filter(p => p.is_online).length,
        totalConnections: connections.length,
        connectedConnections: connections.filter(c => c.status === "connected").length,
        totalDepartments: departments.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
    toast.success("Dados atualizados!");
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    gradient, 
    subtitle 
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    gradient: string;
    subtitle?: string;
  }) => (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} border border-white/10 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white">{loading ? "..." : value}</p>
        <p className="text-sm text-white/70 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Visão geral da plataforma Next Pro</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Empresas Ativas" 
          value={stats.activeCompanies}
          icon={Building2}
          gradient="from-emerald-500/20 to-emerald-500/5"
          subtitle={`${stats.totalCompanies} total`}
        />
        <StatCard 
          title="Usuários Online" 
          value={stats.onlineUsers}
          icon={Users}
          gradient="from-cyan-500/20 to-cyan-500/5"
          subtitle={`${stats.totalUsers} total`}
        />
        <StatCard 
          title="Conexões WhatsApp" 
          value={stats.connectedConnections}
          icon={Zap}
          gradient="from-purple-500/20 to-purple-500/5"
          subtitle={`${stats.totalConnections} total`}
        />
        <StatCard 
          title="Departamentos" 
          value={stats.totalDepartments}
          icon={Activity}
          gradient="from-amber-500/20 to-amber-500/5"
        />
      </div>

      {/* System Status */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-white">Sistema Operacional</h2>
        </div>
        <p className="text-slate-400">
          Backend configurado e funcionando normalmente. Todas as tabelas base foram criadas.
        </p>
      </div>
    </div>
  );
}
