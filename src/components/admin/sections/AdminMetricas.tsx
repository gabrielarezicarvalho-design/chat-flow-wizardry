import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, MessageSquare, Users, Zap, RefreshCw, Loader2,
  Search, TrendingUp, BarChart3, HardDrive, ChevronDown, ChevronRight
} from "lucide-react";

interface CompanyMetrics {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  is_active: boolean;
  totalUsers: number;
  onlineUsers: number;
  totalConversations: number;
  openConversations: number;
  totalMessages: number;
  totalConnections: number;
  activeConnections: number;
  totalCampaigns: number;
  totalLeads: number;
  totalAgents: number;
  totalFlows: number;
  storageEstimate: string;
}

export default function AdminMetricas() {
  const [metrics, setMetrics] = useState<CompanyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"messages" | "conversations" | "users" | "name">("messages");

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch all companies
      const { data: companies, error: compErr } = await supabase
        .from("companies")
        .select("id, name, slug, plan, is_active")
        .order("name");
      if (compErr) throw compErr;

      // Fetch all related data in parallel
      const [
        profilesRes,
        conversationsRes,
        messagesRes,
        connectionsRes,
        campaignsRes,
        leadsRes,
        agentsRes,
        flowsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id, company_id, is_online"),
        supabase.from("conversations").select("id, company_id, status"),
        supabase.from("messages").select("id, conversation_id"),
        supabase.from("connections").select("id, company_id, status"),
        supabase.from("campaigns").select("id, company_id"),
        supabase.from("leads").select("id, company_id"),
        supabase.from("agents").select("id, company_id"),
        supabase.from("flows").select("id, company_id"),
      ]);

      const profiles = profilesRes.data || [];
      const conversations = conversationsRes.data || [];
      const messages = messagesRes.data || [];
      const connections = connectionsRes.data || [];
      const campaigns = campaignsRes.data || [];
      const leads = leadsRes.data || [];
      const agents = agentsRes.data || [];
      const flows = flowsRes.data || [];

      // Build conversation ID to company_id map for messages
      const convCompanyMap = new Map<string, string>();
      conversations.forEach((c) => {
        if (c.company_id) convCompanyMap.set(c.id, c.company_id);
      });

      // Count messages per company
      const msgCountByCompany = new Map<string, number>();
      messages.forEach((m) => {
        const compId = m.conversation_id ? convCompanyMap.get(m.conversation_id) : null;
        if (compId) {
          msgCountByCompany.set(compId, (msgCountByCompany.get(compId) || 0) + 1);
        }
      });

      const result: CompanyMetrics[] = (companies || []).map((company) => {
        const compUsers = profiles.filter((p) => p.company_id === company.id);
        const compConvs = conversations.filter((c) => c.company_id === company.id);
        const compConns = connections.filter((c) => c.company_id === company.id);
        const compCamps = campaigns.filter((c) => c.company_id === company.id);
        const compLeads = leads.filter((l) => l.company_id === company.id);
        const compAgents = agents.filter((a) => a.company_id === company.id);
        const compFlows = flows.filter((f) => f.company_id === company.id);
        const totalMsgs = msgCountByCompany.get(company.id) || 0;

        // Rough storage estimate: ~1KB per message + ~2KB per conversation
        const storageBytes = totalMsgs * 1024 + compConvs.length * 2048;
        const storageEstimate =
          storageBytes > 1024 * 1024
            ? `${(storageBytes / (1024 * 1024)).toFixed(1)} MB`
            : `${(storageBytes / 1024).toFixed(0)} KB`;

        return {
          id: company.id,
          name: company.name,
          slug: company.slug,
          plan: company.plan || "basic",
          is_active: company.is_active ?? true,
          totalUsers: compUsers.length,
          onlineUsers: compUsers.filter((u) => u.is_online).length,
          totalConversations: compConvs.length,
          openConversations: compConvs.filter((c) => c.status === "open").length,
          totalMessages: totalMsgs,
          totalConnections: compConns.length,
          activeConnections: compConns.filter((c) => c.status === "connected").length,
          totalCampaigns: compCamps.length,
          totalLeads: compLeads.length,
          totalAgents: compAgents.length,
          totalFlows: compFlows.length,
          storageEstimate,
        };
      });

      setMetrics(result);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const filtered = metrics
    .filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.slug?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "messages": return b.totalMessages - a.totalMessages;
        case "conversations": return b.totalConversations - a.totalConversations;
        case "users": return b.totalUsers - a.totalUsers;
        default: return a.name.localeCompare(b.name);
      }
    });

  // Totals
  const totals = metrics.reduce(
    (acc, m) => ({
      messages: acc.messages + m.totalMessages,
      conversations: acc.conversations + m.totalConversations,
      users: acc.users + m.totalUsers,
      connections: acc.connections + m.activeConnections,
    }),
    { messages: 0, conversations: 0, users: 0, connections: 0 }
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Métricas por Empresa</h1>
          <p className="text-slate-400">Uso detalhado de cada empresa cliente</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMetrics}
          disabled={loading}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessageSquare} label="Total Mensagens" value={totals.messages.toLocaleString()} gradient="from-blue-500/20 to-blue-500/5" />
        <StatCard icon={TrendingUp} label="Total Conversas" value={totals.conversations.toLocaleString()} gradient="from-emerald-500/20 to-emerald-500/5" />
        <StatCard icon={Users} label="Total Usuários" value={totals.users.toLocaleString()} gradient="from-cyan-500/20 to-cyan-500/5" />
        <StatCard icon={Zap} label="Conexões Ativas" value={totals.connections.toLocaleString()} gradient="from-purple-500/20 to-purple-500/5" />
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>
        <div className="flex gap-2">
          {(["messages", "conversations", "users", "name"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={sortBy === s ? "default" : "ghost"}
              onClick={() => setSortBy(s)}
              className={sortBy === s ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}
            >
              {s === "messages" ? "Mensagens" : s === "conversations" ? "Conversas" : s === "users" ? "Usuários" : "Nome"}
            </Button>
          ))}
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white/5 rounded-xl border border-white/10">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">Nenhuma empresa encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((company) => (
            <div
              key={company.id}
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all"
            >
              {/* Company Row */}
              <button
                onClick={() => setExpandedId(expandedId === company.id ? null : company.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{company.name}</p>
                    <Badge
                      className={
                        company.is_active
                          ? "bg-emerald-500/20 text-emerald-400 text-[10px]"
                          : "bg-red-500/20 text-red-400 text-[10px]"
                      }
                    >
                      {company.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">{company.plan}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{company.slug || "—"}</p>
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <MetricPill icon={MessageSquare} value={company.totalMessages} label="msgs" />
                  <MetricPill icon={TrendingUp} value={company.totalConversations} label="conversas" />
                  <MetricPill icon={Users} value={company.totalUsers} label="usuários" />
                  <MetricPill icon={Zap} value={company.activeConnections} label="conexões" />
                </div>

                {expandedId === company.id ? (
                  <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded Details */}
              {expandedId === company.id && (
                <div className="px-4 pb-4 border-t border-white/5">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4">
                    <DetailCard label="Mensagens" value={company.totalMessages.toLocaleString()} color="text-blue-400" />
                    <DetailCard label="Conversas" value={company.totalConversations.toLocaleString()} sub={`${company.openConversations} abertas`} color="text-emerald-400" />
                    <DetailCard label="Usuários" value={company.totalUsers.toLocaleString()} sub={`${company.onlineUsers} online`} color="text-cyan-400" />
                    <DetailCard label="Conexões WA" value={company.totalConnections.toLocaleString()} sub={`${company.activeConnections} ativas`} color="text-purple-400" />
                    <DetailCard label="Campanhas" value={company.totalCampaigns.toLocaleString()} color="text-amber-400" />
                    <DetailCard label="Leads" value={company.totalLeads.toLocaleString()} color="text-pink-400" />
                    <DetailCard label="Agentes IA" value={company.totalAgents.toLocaleString()} color="text-indigo-400" />
                    <DetailCard label="Fluxos" value={company.totalFlows.toLocaleString()} color="text-orange-400" />
                    <DetailCard label="Armazenamento" value={company.storageEstimate} icon={<HardDrive className="h-3 w-3" />} color="text-slate-300" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: any;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} border border-white/10`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-white/70" />
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MetricPill({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-300">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="font-medium">{value.toLocaleString()}</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

function DetailCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
