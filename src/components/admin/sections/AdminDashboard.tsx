import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, Users, MessageSquare, Zap, TrendingUp, 
  AlertTriangle, CheckCircle, XCircle, Activity, Clock,
  HardDrive, Database, Download, RefreshCw, Calculator, Sliders
} from "lucide-react";
import { differenceInDays, isPast, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

// Limites do Supabase (Plano atual)
const SUPABASE_LIMITS = {
  database: 500 * 1024 * 1024, // 500MB
  storage: 1 * 1024 * 1024 * 1024, // 1GB
  get total() { return this.database + this.storage; }
};

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  blockedCompanies: number;
  expiredCompanies: number;
  expiringCompanies: number;
  totalAgents: number;
  onlineAgents: number;
  totalConversations: number;
  activeConversations: number;
  messagesToday: number;
  totalConnections: number;
  connectedConnections: number;
}

interface StorageStats {
  databaseSize: number;
  storageSize: number;
  totalSize: number;
  dbLimit: number;
  storageLimit: number;
  dbPercentage: number;
  storagePercentage: number;
  totalPercentage: number;
  estimatedDaysToFull: number;
  companiesCapacity: number;
  avgPerCompany: number;
  avgDbPerCompany: number;
  avgStoragePerCompany: number;
}

interface CompanyUsage {
  id: string;
  name: string;
  conversations: number;
  leads: number;
  messages: number;
  estimatedMB: number;
  percentage: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    activeCompanies: 0,
    blockedCompanies: 0,
    expiredCompanies: 0,
    expiringCompanies: 0,
    totalAgents: 0,
    onlineAgents: 0,
    totalConversations: 0,
    activeConversations: 0,
    messagesToday: 0,
    totalConnections: 0,
    connectedConnections: 0,
  });
  const [storageStats, setStorageStats] = useState<StorageStats>({
    databaseSize: 0,
    storageSize: 0,
    totalSize: 0,
    dbLimit: SUPABASE_LIMITS.database,
    storageLimit: SUPABASE_LIMITS.storage,
    dbPercentage: 0,
    storagePercentage: 0,
    totalPercentage: 0,
    estimatedDaysToFull: 999,
    companiesCapacity: 0,
    avgPerCompany: 0,
    avgDbPerCompany: 0,
    avgStoragePerCompany: 0,
  });
  const [companyUsage, setCompanyUsage] = useState<CompanyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Simulador de capacidade
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatedCompanies, setSimulatedCompanies] = useState(10);
  const [storagePerCompany, setStoragePerCompany] = useState(50); // MB

  useEffect(() => {
    fetchStats();
    fetchStorageStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        companiesRes,
        profilesRes,
        conversationsRes,
        connectionsRes,
        messagesRes
      ] = await Promise.all([
        supabase.from("companies").select("*"),
        supabase.from("profiles").select("id, is_online, company_id"),
        supabase.from("conversations").select("id, status, user_id"),
        supabase.from("connections").select("id, status"),
        supabase.from("messages").select("id").gte("criado_em", new Date().toISOString().split("T")[0])
      ]);

      const companies = companiesRes.data || [];
      const profiles = profilesRes.data || [];
      const conversations = conversationsRes.data || [];
      const connections = connectionsRes.data || [];
      const messages = messagesRes.data || [];

      const now = new Date();
      const expiredCompanies = companies.filter(c => c.expires_at && isPast(new Date(c.expires_at)));
      const expiringCompanies = companies.filter(c => {
        if (!c.expires_at) return false;
        const days = differenceInDays(new Date(c.expires_at), now);
        return days > 0 && days <= 7;
      });

      setStats({
        totalCompanies: companies.length,
        activeCompanies: companies.filter(c => c.is_active && !c.is_blocked).length,
        blockedCompanies: companies.filter(c => c.is_blocked).length,
        expiredCompanies: expiredCompanies.length,
        expiringCompanies: expiringCompanies.length,
        totalAgents: profiles.length,
        onlineAgents: profiles.filter(p => p.is_online).length,
        totalConversations: conversations.length,
        activeConversations: conversations.filter(c => c.status === "active").length,
        messagesToday: messages.length,
        totalConnections: connections.length,
        connectedConnections: connections.filter(c => c.status === "connected").length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageStats = async () => {
    try {
      // Get counts for storage estimation
      const [conversationsRes, leadsRes, messagesRes, companiesRes] = await Promise.all([
        supabase.from("conversations").select("id, user_id", { count: 'exact' }),
        supabase.from("leads").select("id, user_id", { count: 'exact' }),
        supabase.from("messages").select("id, id_da_conversa", { count: 'exact' }),
        supabase.from("companies").select("id, name")
      ]);

      const totalConversations = conversationsRes.count || 0;
      const totalLeads = leadsRes.count || 0;
      const totalMessages = messagesRes.count || 0;

      // Estimate database size (rough calculation)
      // Average row sizes: conversation ~500B, lead ~300B, message ~1KB
      const estimatedDbSize = (totalConversations * 500) + (totalLeads * 300) + (totalMessages * 1024);
      
      // Get storage bucket sizes (estimate)
      let storageSize = 0;
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        if (buckets) {
          for (const bucket of buckets) {
            const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000 });
            if (files) {
              for (const file of files) {
                if (file.metadata?.size) storageSize += file.metadata.size;
              }
            }
          }
        }
      } catch (e) {
        console.log('Could not get storage stats');
      }

      const totalSize = estimatedDbSize + storageSize;
      const dbPercentage = Math.round((estimatedDbSize / SUPABASE_LIMITS.database) * 100);
      const storagePercentage = Math.round((storageSize / SUPABASE_LIMITS.storage) * 100);
      const totalPercentage = Math.round((totalSize / SUPABASE_LIMITS.total) * 100);

      // Calculate avg per company and capacity
      const companies = companiesRes.data || [];
      const avgDbPerCompany = companies.length > 0 ? estimatedDbSize / companies.length : 0;
      const avgStoragePerCompany = companies.length > 0 ? storageSize / companies.length : 0;
      const avgPerCompany = avgDbPerCompany + avgStoragePerCompany;
      
      const remainingDb = SUPABASE_LIMITS.database - estimatedDbSize;
      const remainingStorage = SUPABASE_LIMITS.storage - storageSize;
      
      // Capacity based on the more limiting factor
      // If no data yet (avgPerCompany = 0), show 0 capacity instead of arbitrary large number
      const dbCapacity = avgDbPerCompany > 0 ? Math.floor(remainingDb / avgDbPerCompany) : 0;
      const storageCapacity = avgStoragePerCompany > 0 ? Math.floor(remainingStorage / avgStoragePerCompany) : 0;
      const companiesCapacity = avgPerCompany > 0 ? Math.min(dbCapacity, storageCapacity) : 0;

      // Estimate days to full (assuming 5% growth per week)
      const weeklyGrowthRate = 0.05;
      const dailyGrowthRate = weeklyGrowthRate / 7;
      const highestPercentage = Math.max(dbPercentage, storagePercentage);
      const estimatedDaysToFull = highestPercentage >= 80 ? 
        Math.floor((100 - highestPercentage) / (highestPercentage * dailyGrowthRate)) : 
        0; // 0 means "not applicable" when usage is low

      setStorageStats({
        databaseSize: estimatedDbSize,
        storageSize,
        totalSize,
        dbLimit: SUPABASE_LIMITS.database,
        storageLimit: SUPABASE_LIMITS.storage,
        dbPercentage,
        storagePercentage,
        totalPercentage,
        estimatedDaysToFull,
        companiesCapacity,
        avgPerCompany,
        avgDbPerCompany,
        avgStoragePerCompany,
      });

      // Calculate per-company usage
      const usage: CompanyUsage[] = companies.map(company => {
        const companyConversations = (conversationsRes.data || []).filter(c => c.user_id).length / Math.max(companies.length, 1);
        const companyLeads = (leadsRes.data || []).length / Math.max(companies.length, 1);
        const companyMessages = (messagesRes.data || []).length / Math.max(companies.length, 1);
        const estimatedMB = avgPerCompany / (1024 * 1024);
        
        return {
          id: company.id,
          name: company.name,
          conversations: Math.round(companyConversations),
          leads: Math.round(companyLeads),
          messages: Math.round(companyMessages),
          estimatedMB: Math.round(estimatedMB * 100) / 100,
          percentage: companies.length > 0 ? Math.round(100 / companies.length) : 0,
        };
      });

      setCompanyUsage(usage.slice(0, 10));

    } catch (error) {
      console.error("Error fetching storage stats:", error);
    }
  };

  // Cálculos do simulador
  const simulatorCalculations = () => {
    const totalStorageNeeded = simulatedCompanies * storagePerCompany * 1024 * 1024; // Convert MB to bytes
    const dbEstimate = totalStorageNeeded * 0.3; // 30% database
    const storageEstimate = totalStorageNeeded * 0.7; // 70% storage files
    
    const dbUsage = storageStats.databaseSize + dbEstimate;
    const storageUsage = storageStats.storageSize + storageEstimate;
    
    const dbPercentage = (dbUsage / SUPABASE_LIMITS.database) * 100;
    const storagePercentage = (storageUsage / SUPABASE_LIMITS.storage) * 100;
    
    const isSafe = dbPercentage < 80 && storagePercentage < 80;
    const exceedsDb = dbPercentage > 100;
    const exceedsStorage = storagePercentage > 100;
    
    // Cálculo máximo de empresas possíveis
    const remainingDb = SUPABASE_LIMITS.database - storageStats.databaseSize;
    const remainingStorage = SUPABASE_LIMITS.storage - storageStats.storageSize;
    const dbPerCompany = storagePerCompany * 1024 * 1024 * 0.3;
    const storagePerCompanyCalc = storagePerCompany * 1024 * 1024 * 0.7;
    
    const maxByDb = Math.floor(remainingDb / dbPerCompany);
    const maxByStorage = Math.floor(remainingStorage / storagePerCompanyCalc);
    const maxCompanies = Math.min(maxByDb, maxByStorage);
    
    // Limite recomendado por empresa
    const recommendedPerCompany = (remainingDb + remainingStorage) / (simulatedCompanies * 1.5); // com margem de 50%
    
    return {
      dbUsage,
      storageUsage,
      dbPercentage: Math.min(dbPercentage, 150),
      storagePercentage: Math.min(storagePercentage, 150),
      isSafe,
      exceedsDb,
      exceedsStorage,
      maxCompanies,
      recommendedPerCompany,
    };
  };

  const simResults = simulatorCalculations();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchStorageStats()]);
    setRefreshing(false);
    toast.success("Dados atualizados!");
  };

  const handleExportBackup = () => {
    toast.info("Funcionalidade de backup em desenvolvimento", {
      description: "Acesse o painel do Supabase para fazer backup manual do banco de dados.",
      duration: 5000,
    });
  };

  const getStorageAlertLevel = () => {
    const maxPercentage = Math.max(storageStats.dbPercentage, storageStats.storagePercentage);
    if (maxPercentage >= 80) return { level: 'critical', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
    if (maxPercentage >= 60) return { level: 'warning', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' };
    return { level: 'healthy', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
  };

  const getBackupPrediction = () => {
    const maxPercentage = Math.max(storageStats.dbPercentage, storageStats.storagePercentage);
    if (maxPercentage >= 80) {
      return `⚠️ BACKUP URGENTE - Armazenamento em ${maxPercentage}%`;
    }
    if (storageStats.estimatedDaysToFull < 30) {
      return `Previsão: backup necessário em ${storageStats.estimatedDaysToFull} dias`;
    }
    return "Sistema saudável - próximo backup recomendado em 30 dias";
  };

  const alertLevel = getStorageAlertLevel();

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
          <p className="text-slate-400">Visão geral da plataforma MarketFlow</p>
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

      {/* System Health Alert */}
      <div className={`p-4 rounded-2xl ${alertLevel.bg} border ${alertLevel.border} mb-8`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardDrive className={`h-6 w-6 ${alertLevel.color}`} />
            <div>
              <h3 className={`font-semibold ${alertLevel.color}`}>
                {alertLevel.level === 'critical' ? '🚨 BACKUP URGENTE' : 
                 alertLevel.level === 'warning' ? '⚠️ Atenção ao Armazenamento' : 
                 '✅ Sistema Saudável'}
              </h3>
              <p className="text-sm text-slate-300">{getBackupPrediction()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{Math.max(storageStats.dbPercentage, storageStats.storagePercentage)}%</p>
              <p className="text-xs text-slate-400">{formatBytes(storageStats.totalSize)} / {formatBytes(SUPABASE_LIMITS.total)}</p>
            </div>
            <Button 
              size="sm" 
              onClick={handleExportBackup}
              className={alertLevel.level === 'critical' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}
            >
              <Download className="h-4 w-4 mr-2" />
              Backup
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Database</span>
              <span>{formatBytes(storageStats.databaseSize)} / 500 MB ({storageStats.dbPercentage}%)</span>
            </div>
            <Progress value={storageStats.dbPercentage} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Storage</span>
              <span>{formatBytes(storageStats.storageSize)} / 1 GB ({storageStats.storagePercentage}%)</span>
            </div>
            <Progress value={storageStats.storagePercentage} className="h-2" />
          </div>
        </div>
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
          title="Agentes Online" 
          value={stats.onlineAgents}
          icon={Users}
          gradient="from-cyan-500/20 to-cyan-500/5"
          subtitle={`${stats.totalAgents} total`}
        />
        <StatCard 
          title="Conversas Ativas" 
          value={stats.activeConversations}
          icon={MessageSquare}
          gradient="from-purple-500/20 to-purple-500/5"
          subtitle="Em tempo real"
        />
        <StatCard 
          title="Mensagens Hoje" 
          value={stats.messagesToday}
          icon={Zap}
          gradient="from-amber-500/20 to-amber-500/5"
        />
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Storage Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-400" />
            Capacidade do Sistema
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-slate-300">Banco de Dados</span>
              <span className="text-white font-medium">{formatBytes(storageStats.databaseSize)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-slate-300">Storage (Arquivos)</span>
              <span className="text-white font-medium">{formatBytes(storageStats.storageSize)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-slate-300">Capacidade p/ Empresas</span>
              <span className="text-emerald-400 font-medium">
                {storageStats.avgPerCompany > 0 ? `+${storageStats.companiesCapacity} empresas` : 'Sem dados'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-slate-300">Média por Empresa</span>
              <span className="text-white font-medium">{formatBytes(storageStats.avgPerCompany)}</span>
            </div>
          </div>
        </div>

        {/* Attention Needed */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Atenção Necessária
          </h3>
          <div className="space-y-3">
            {Math.max(storageStats.dbPercentage, storageStats.storagePercentage) >= 80 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10">
                <HardDrive className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-white font-medium">Armazenamento em {Math.max(storageStats.dbPercentage, storageStats.storagePercentage)}%</p>
                  <p className="text-xs text-slate-400">Fazer backup imediatamente</p>
                </div>
              </div>
            )}
            {stats.expiredCompanies > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-white font-medium">{stats.expiredCompanies} empresa(s) vencida(s)</p>
                  <p className="text-xs text-slate-400">Necessita renovação</p>
                </div>
              </div>
            )}
            {stats.expiringCompanies > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-white font-medium">{stats.expiringCompanies} vencendo em 7 dias</p>
                  <p className="text-xs text-slate-400">Avise o cliente</p>
                </div>
              </div>
            )}
            {stats.blockedCompanies > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-white font-medium">{stats.blockedCompanies} bloqueada(s)</p>
                  <p className="text-xs text-slate-400">Verificar situação</p>
                </div>
              </div>
            )}
            {Math.max(storageStats.dbPercentage, storageStats.storagePercentage) < 80 && stats.expiredCompanies === 0 && stats.expiringCompanies === 0 && stats.blockedCompanies === 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-white font-medium">Tudo em ordem!</p>
                  <p className="text-xs text-slate-400">Nenhuma ação necessária</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Ações Rápidas
          </h3>
          <div className="space-y-2">
            <button 
              onClick={handleExportBackup}
              className="w-full p-3 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors text-left"
            >
              📥 Exportar Backup do Sistema
            </button>
            <button className="w-full p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors text-left">
              + Criar nova empresa
            </button>
            <button className="w-full p-3 rounded-xl bg-purple-500/10 text-purple-400 text-sm font-medium hover:bg-purple-500/20 transition-colors text-left">
              Ver todos os relatórios
            </button>
          </div>
        </div>
      </div>

      {/* Simulador de Capacidade */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="h-5 w-5 text-violet-400" />
            Simulador de Capacidade
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulatorOpen(!simulatorOpen)}
            className="border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
          >
            <Sliders className="h-4 w-4 mr-2" />
            {simulatorOpen ? 'Fechar' : 'Abrir Simulador'}
          </Button>
        </div>

        {/* Resultado resumido sempre visível */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-sm text-slate-400 mb-1">Máximo de Empresas</p>
            <p className="text-2xl font-bold text-emerald-400">+{simResults.maxCompanies}</p>
            <p className="text-xs text-slate-500">com base no uso atual</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-sm text-slate-400 mb-1">Limite Recomendado/Empresa</p>
            <p className="text-2xl font-bold text-cyan-400">{formatBytes(simResults.recommendedPerCompany)}</p>
            <p className="text-xs text-slate-500">para {simulatedCompanies} empresas</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-sm text-slate-400 mb-1">Média Atual/Empresa</p>
            <p className="text-2xl font-bold text-white">{formatBytes(storageStats.avgPerCompany)}</p>
            <p className="text-xs text-slate-500">{stats.activeCompanies} empresas ativas</p>
          </div>
        </div>

        {simulatorOpen && (
          <div className="mt-6 p-5 rounded-xl bg-slate-900/50 border border-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Controles */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-slate-300">Quantidade de Empresas</label>
                    <span className="text-sm font-medium text-violet-400">{simulatedCompanies}</span>
                  </div>
                  <Slider
                    value={[simulatedCompanies]}
                    onValueChange={(v) => setSimulatedCompanies(v[0])}
                    min={1}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1</span>
                    <span>100</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-slate-300">Storage por Empresa (MB)</label>
                    <span className="text-sm font-medium text-cyan-400">{storagePerCompany} MB</span>
                  </div>
                  <Slider
                    value={[storagePerCompany]}
                    onValueChange={(v) => setStoragePerCompany(v[0])}
                    min={10}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>10 MB</span>
                    <span>200 MB</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-slate-400 mb-2">Total necessário estimado:</p>
                  <p className="text-xl font-bold text-white">
                    {formatBytes(simulatedCompanies * storagePerCompany * 1024 * 1024)}
                  </p>
                </div>
              </div>

              {/* Resultado Visual */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Uso do Database (500 MB)</span>
                    <span className={simResults.exceedsDb ? 'text-red-400' : 'text-white'}>
                      {simResults.dbPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        simResults.dbPercentage > 100 ? 'bg-red-500' : 
                        simResults.dbPercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(simResults.dbPercentage, 100)}%` }}
                    />
                  </div>
                  {simResults.exceedsDb && (
                    <p className="text-xs text-red-400 mt-1">⚠️ Excede o limite do Database!</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Uso do Storage (1 GB)</span>
                    <span className={simResults.exceedsStorage ? 'text-red-400' : 'text-white'}>
                      {simResults.storagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        simResults.storagePercentage > 100 ? 'bg-red-500' : 
                        simResults.storagePercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(simResults.storagePercentage, 100)}%` }}
                    />
                  </div>
                  {simResults.exceedsStorage && (
                    <p className="text-xs text-red-400 mt-1">⚠️ Excede o limite do Storage!</p>
                  )}
                </div>

                <div className={`mt-4 p-4 rounded-xl ${
                  simResults.isSafe ? 'bg-emerald-500/10 border border-emerald-500/30' : 
                  'bg-red-500/10 border border-red-500/30'
                }`}>
                  {simResults.isSafe ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                      <div>
                        <p className="font-medium text-emerald-400">Cenário Seguro</p>
                        <p className="text-xs text-slate-400">
                          {simulatedCompanies} empresas com {storagePerCompany}MB cada está dentro dos limites
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                      <div>
                        <p className="font-medium text-red-400">Cenário Excede Limites</p>
                        <p className="text-xs text-slate-400">
                          Reduza a quantidade de empresas ou o storage por empresa
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connections Status */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          Status das Integrações
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <span className="text-slate-300">WhatsApp API</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {stats.connectedConnections}/{stats.totalConnections}
              </span>
              <div className={`h-2.5 w-2.5 rounded-full ${stats.connectedConnections > 0 ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <span className="text-slate-300">Webhooks</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-emerald-400">Ativo</span>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <span className="text-slate-300">Supabase Principal</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-emerald-400">Conectado</span>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
