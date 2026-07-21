import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeads } from "@/hooks/useLeads";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  UserRound,
  Target,
  Settings as SettingsIcon,
  UserPlus,
  Sparkles,
  Filter as FilterIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  Search,
  Download,
  MessageSquare,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta" },
  { value: "converted", label: "Convertido" },
  { value: "lost", label: "Perdido" },
];

const statusColor: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  contacted: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  qualified: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  proposal: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
  converted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  lost: "bg-red-500/10 text-red-500 border-red-500/30",
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) => (
  <Card className="bg-card/60 border-border/60">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

type Salesperson = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  last_assigned_at: string | null;
  monthly_goal: number;
  assigned_count: number;
  converted_count: number;
};

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

const escapeCsv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function Vendas() {
  const { leads, updateLead } = useLeads() as any;
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [signMessages, setSignMessages] = useState(true);
  const [format, setFormat] = useState("*{nome}*:\n{msg}");
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [lockConversation, setLockConversation] = useState(true);
  const [sla, setSla] = useState(30);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterOwner("all");
    setFilterSource("all");
    setFilterFrom("");
    setFilterTo("");
  };

  const loadSalespeople = async (cid: string) => {
    setLoadingTeam(true);
    const { data: perms, error } = await supabase
      .from("user_permissions")
      .select("user_id, last_assigned_at, monthly_goal")
      .eq("company_id", cid)
      .eq("sales", true);
    if (error) {
      toast.error("Erro ao carregar vendedores");
      setLoadingTeam(false);
      return;
    }
    const ids = (perms ?? []).map((p: any) => p.user_id);
    if (ids.length === 0) {
      setSalespeople([]);
      setLoadingTeam(false);
      return;
    }
    const [{ data: profs }, { data: assigned }, { data: converted }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, username").in("id", ids),
      supabase.from("leads").select("user_id").eq("company_id", cid).in("user_id", ids),
      supabase
        .from("leads")
        .select("user_id")
        .eq("company_id", cid)
        .eq("status", "converted")
        .in("user_id", ids)
        .gte("updated_at", monthStart()),
    ]);
    const assignedMap = new Map<string, number>();
    (assigned ?? []).forEach((l: any) => assignedMap.set(l.user_id, (assignedMap.get(l.user_id) ?? 0) + 1));
    const convertedMap = new Map<string, number>();
    (converted ?? []).forEach((l: any) => convertedMap.set(l.user_id, (convertedMap.get(l.user_id) ?? 0) + 1));

    const rows: Salesperson[] = (perms ?? []).map((p: any) => {
      const prof = (profs ?? []).find((x: any) => x.id === p.user_id);
      return {
        user_id: p.user_id,
        full_name: prof?.full_name ?? null,
        username: prof?.username ?? null,
        last_assigned_at: p.last_assigned_at,
        monthly_goal: p.monthly_goal ?? 0,
        assigned_count: assignedMap.get(p.user_id) ?? 0,
        converted_count: convertedMap.get(p.user_id) ?? 0,
      };
    });
    setSalespeople(rows);
    setLoadingTeam(false);
  };

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      setLoadingSettings(true);
      const { data, error } = await supabase
        .from("sales_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast.error("Erro ao carregar configurações");
      } else if (data) {
        setSignMessages(data.sign_messages);
        setFormat(data.message_format);
        setAutoDistribute(data.auto_distribute);
        setLockConversation(data.lock_conversation);
        setSla(data.sla_minutes);
      }
      setLoadingSettings(false);
      loadSalespeople(companyId);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  const handleSaveSettings = async () => {
    if (!companyId) return toast.error("Nenhuma empresa vinculada ao usuário");
    setSavingSettings(true);
    const { error } = await supabase
      .from("sales_settings")
      .upsert(
        {
          company_id: companyId,
          sign_messages: signMessages,
          message_format: format,
          auto_distribute: autoDistribute,
          lock_conversation: lockConversation,
          sla_minutes: sla,
        },
        { onConflict: "company_id" },
      );
    setSavingSettings(false);
    if (error) toast.error(error.message || "Erro ao salvar configurações");
    else toast.success("Configurações salvas!");
  };

  const handleDistribute = async () => {
    if (!companyId) return toast.error("Nenhuma empresa vinculada ao usuário");
    if (salespeople.length === 0) return toast.error("Nenhum vendedor com permissão de Vendas");
    setDistributing(true);
    try {
      const { data: unassigned, error } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", companyId)
        .is("user_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!unassigned || unassigned.length === 0) {
        toast.info("Nenhum lead sem atribuição");
        return;
      }
      const queue = [...salespeople].sort((a, b) => {
        const ta = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
        const tb = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
        return ta - tb;
      });
      let idx = 0;
      const perUserLast = new Map<string, string>();
      for (const lead of unassigned) {
        const target = queue[idx % queue.length];
        const ts = new Date(Date.now() + idx).toISOString();
        const { error: upErr } = await supabase
          .from("leads")
          .update({ user_id: target.user_id, status: "contacted" })
          .eq("id", lead.id);
        if (upErr) throw upErr;
        perUserLast.set(target.user_id, ts);
        idx++;
      }
      await Promise.all(
        Array.from(perUserLast.entries()).map(([uid, ts]) =>
          supabase.from("user_permissions").update({ last_assigned_at: ts }).eq("user_id", uid),
        ),
      );
      toast.success(`${unassigned.length} lead(s) distribuído(s) entre ${queue.length} vendedor(es)`);
      await loadSalespeople(companyId);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (e: any) {
      toast.error(e.message || "Falha na distribuição");
    } finally {
      setDistributing(false);
    }
  };

  // === Lead actions ===
  const changeStatus = async (id: string, status: string) => {
    updateLead.mutate({ id, updates: { status } });
  };

  const reassignLead = async (id: string, userId: string) => {
    updateLead.mutate({ id, updates: { user_id: userId } });
  };

  const openConversation = async (lead: any) => {
    if (!lead.phone) return toast.error("Lead sem telefone");
    const phoneDigits = lead.phone.replace(/\D/g, "");
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("company_id", companyId)
      .ilike("contact_phone", `%${phoneDigits}%`)
      .limit(1)
      .maybeSingle();
    if (data?.id) navigate(`/conversations?id=${data.id}`);
    else {
      toast.info("Nenhuma conversa encontrada — abrindo Conversas");
      navigate(`/conversations?phone=${encodeURIComponent(phoneDigits)}`);
    }
  };

  // === Derived data ===
  const sources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l: any) => l.source && set.add(l.source));
    return Array.from(set);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = filterFrom ? new Date(filterFrom).getTime() : null;
    const to = filterTo ? new Date(filterTo).getTime() + 86400000 : null;
    return leads.filter((l: any) => {
      if (filterStatus !== "all" && (l.status || "new") !== filterStatus) return false;
      if (filterOwner === "unassigned" && l.user_id) return false;
      if (filterOwner !== "all" && filterOwner !== "unassigned" && l.user_id !== filterOwner) return false;
      if (filterSource !== "all" && (l.source || "") !== filterSource) return false;
      if (from && new Date(l.created_at).getTime() < from) return false;
      if (to && new Date(l.created_at).getTime() > to) return false;
      if (q) {
        const hay = `${l.name ?? ""} ${l.phone ?? ""} ${l.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, filterStatus, filterOwner, filterSource, filterFrom, filterTo]);

  const myLeads = useMemo(
    () => filteredLeads.filter((l: any) => l.user_id === user?.id),
    [filteredLeads, user?.id],
  );

  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l: any) => l.status === "converted").length;
    const contacted = leads.filter((l: any) => l.status === "contacted").length;
    const newLeads = leads.filter((l: any) => l.status === "new").length;
    const unassigned = leads.filter((l: any) => !l.user_id).length;
    return { total, converted, contacted, newLeads, unassigned };
  }, [leads]);

  const exportCsv = (rows: any[], filename: string) => {
    if (rows.length === 0) return toast.info("Nada para exportar");
    const nameOf = (uid: string | null) => {
      if (!uid) return "";
      const s = salespeople.find((x) => x.user_id === uid);
      return s?.full_name || s?.username || uid.slice(0, 8);
    };
    const header = ["Nome", "Telefone", "Email", "Status", "Origem", "Vendedor", "Criado em"];
    const body = rows.map((l) => [
      l.name,
      l.phone,
      l.email,
      l.status,
      l.source,
      nameOf(l.user_id),
      new Date(l.created_at).toLocaleString("pt-BR"),
    ]);
    const csv = [header, ...body].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${rows.length} lead(s)`);
  };

  const exportMonthlyReport = () => {
    if (salespeople.length === 0) return toast.info("Nenhum vendedor para exportar");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthLabel = now.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });

    const header = [
      "Vendedor",
      "Mês",
      "Leads atribuídos",
      "Em andamento",
      "Ganhos",
      "Perdidos",
      "Meta",
      "Atingimento (%)",
    ];

    const body = salespeople.map((s) => {
      const mine = leads.filter(
        (l: any) => l.user_id === s.user_id && new Date(l.created_at).getTime() >= monthStart,
      );
      const assigned = mine.length;
      const won = mine.filter((l: any) => l.status === "converted").length;
      const lost = mine.filter((l: any) => l.status === "lost").length;
      const inProgress = mine.filter((l: any) =>
        ["new", "contacted", "qualified", "negotiating"].includes(l.status),
      ).length;
      const goal = s.monthly_goal || 0;
      const pct = goal > 0 ? ((won / goal) * 100).toFixed(1) : "—";
      return [
        s.full_name || s.username || s.user_id.slice(0, 8),
        monthLabel,
        assigned,
        inProgress,
        won,
        lost,
        goal,
        pct,
      ];
    });

    const csv = [header, ...body].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-vendedores-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Relatório mensal exportado (${body.length} vendedor(es))`);
  };

  const saveGoal = async (userId: string, value: number) => {
    const { error } = await supabase
      .from("user_permissions")
      .update({ monthly_goal: value })
      .eq("user_id", userId);
    if (error) return toast.error("Erro ao salvar meta");
    toast.success("Meta atualizada");
    if (companyId) loadSalespeople(companyId);
  };

  const salespersonName = (uid: string | null) => {
    if (!uid) return "—";
    const s = salespeople.find((x) => x.user_id === uid);
    return s?.full_name || s?.username || uid.slice(0, 8);
  };

  const LeadRow = ({ lead }: { lead: any }) => (
    <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-b border-border/60 text-sm hover:bg-muted/30">
      <div className="col-span-3">
        <p className="font-medium truncate">{lead.name || "Sem nome"}</p>
        <p className="text-xs text-muted-foreground truncate">{lead.phone || "sem telefone"}</p>
      </div>
      <div className="col-span-2 text-xs text-muted-foreground truncate">{lead.source || "—"}</div>
      <div className="col-span-2">
        <Select value={lead.status || "new"} onValueChange={(v) => changeStatus(lead.id, v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Select
          value={lead.user_id || "unassigned"}
          onValueChange={(v) => reassignLead(lead.id, v === "unassigned" ? (null as any) : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sem dono" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sem dono</SelectItem>
            {salespeople.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>
                {s.full_name || s.username || s.user_id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 text-xs text-muted-foreground">
        {new Date(lead.created_at).toLocaleDateString("pt-BR")}
      </div>
      <div className="col-span-1 text-right">
        <Button size="sm" variant="ghost" title="Abrir conversa" onClick={() => openConversation(lead)}>
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const LeadTable = ({ rows, empty }: { rows: any[]; empty: string }) => (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/40 border-b border-border/60">
        <div className="col-span-3">Lead</div>
        <div className="col-span-2">Origem</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Vendedor</div>
        <div className="col-span-2">Criado</div>
        <div className="col-span-1 text-right">Ações</div>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        rows.slice(0, 200).map((l) => <LeadRow key={l.id} lead={l} />)
      )}
      {rows.length > 200 && (
        <div className="p-2 text-xs text-center text-muted-foreground border-t border-border/60">
          Mostrando 200 de {rows.length} — use os filtros para refinar
        </div>
      )}
    </div>
  );

  const FilterBar = () => (
    <Card className="bg-card/60 border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, telefone ou email"
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="w-40">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label className="text-xs">Vendedor</Label>
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unassigned">Sem dono</SelectItem>
                {salespeople.map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {s.full_name || s.username || s.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Label className="text-xs">Origem</Label>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Label className="text-xs">De</Label>
            <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9" />
          </div>
          <div className="w-36">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9" />
          </div>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />Limpar
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportCsv(filteredLeads, `leads-${Date.now()}.csv`)}>
            <Download className="w-4 h-4 mr-1" />Exportar CSV
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {filteredLeads.length} de {leads.length} lead(s)
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciador de Vendas</h1>
          <p className="text-muted-foreground">Distribua leads e acompanhe a performance do seu time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={handleDistribute}
            disabled={distributing || salespeople.length === 0}
          >
            {distributing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Distribuir Leads {stats.unassigned > 0 ? `(${stats.unassigned})` : ""}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-card/60 border border-border/60">
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="w-4 h-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="distribuicao" className="gap-2"><Users className="w-4 h-4" /> Distribuição</TabsTrigger>
          <TabsTrigger value="por-vendedor" className="gap-2"><UserRound className="w-4 h-4" /> Por Vendedor</TabsTrigger>
          <TabsTrigger value="todos-leads" className="gap-2"><Target className="w-4 h-4" /> Todos os Leads</TabsTrigger>
          <TabsTrigger value="meus-leads" className="gap-2"><Target className="w-4 h-4" /> Meus Leads</TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2"><SettingsIcon className="w-4 h-4" /> Configurações</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total de Leads" value={stats.total} icon={Target} />
            <StatCard label="Novos" value={stats.newLeads} icon={Sparkles} />
            <StatCard label="Contatados" value={stats.contacted} icon={Clock} />
            <StatCard
              label="Convertidos"
              value={stats.converted}
              icon={CheckCircle2}
              hint={stats.total ? `${((stats.converted / stats.total) * 100).toFixed(1)}% de conversão` : "—"}
            />
          </div>
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Meta do mês por vendedor</h3>
              </div>
              {salespeople.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Convide vendedores em <span className="font-medium">Equipe</span> e marque a permissão "sales".
                </p>
              ) : (
                <div className="space-y-3">
                  {salespeople.map((s) => {
                    const pct = s.monthly_goal > 0 ? Math.min(100, (s.converted_count / s.monthly_goal) * 100) : 0;
                    return (
                      <div key={s.user_id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{s.full_name || s.username || s.user_id.slice(0, 8)}</span>
                          <span className="text-muted-foreground">
                            {s.converted_count}/{s.monthly_goal || "—"} conv.
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribuição */}
        <TabsContent value="distribuicao">
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Nova Distribuição</h2>
                <p className="text-sm text-muted-foreground">Escolha como deseja distribuir novos leads.</p>
              </div>

              {salespeople.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Você ainda não tem vendedores com permissão de{" "}
                    <span className="font-medium text-foreground">Vendas</span>.
                  </p>
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/users">Ir para Equipe</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Fila de rodízio ({salespeople.length} vendedor{salespeople.length > 1 ? "es" : ""})
                    </p>
                    <Button size="sm" onClick={handleDistribute} disabled={distributing || stats.unassigned === 0}>
                      {distributing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Distribuir {stats.unassigned} lead(s) sem dono
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                    {[...salespeople]
                      .sort((a, b) => {
                        const ta = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
                        const tb = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
                        return ta - tb;
                      })
                      .map((s, i) => (
                        <div key={s.user_id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {s.full_name || s.username || s.user_id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Último lead:{" "}
                                {s.last_assigned_at
                                  ? new Date(s.last_assigned_at).toLocaleString("pt-BR")
                                  : "nunca"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{s.assigned_count}</p>
                            <p className="text-xs text-muted-foreground">leads atribuídos</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  {loadingTeam && <p className="text-xs text-muted-foreground">Atualizando fila...</p>}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-semibold">Modo ativo</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Rodízio Automático (Round-Robin)</p>
                      <p className="text-xs text-muted-foreground">Distribui igualmente entre todos online.</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-4 flex items-start gap-3 hover:bg-muted/30">
                    <FilterIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Distribuição por Regras</p>
                      <p className="text-xs text-muted-foreground">Baseado em cidade, estado ou DDD (em breve).</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Vendedor */}
        <TabsContent value="por-vendedor">
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Desempenho por vendedor</h3>
                  <p className="text-xs text-muted-foreground">
                    Exporte o relatório mensal com leads, ganhos, perdidos e cumprimento das metas.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={exportMonthlyReport}>
                  <Download className="w-4 h-4 mr-1" />
                  Relatório mensal CSV
                </Button>
              </div>
              {salespeople.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Nenhum vendedor com permissão de Vendas.
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/40 border-b border-border/60">
                    <div className="col-span-4">Vendedor</div>
                    <div className="col-span-2 text-center">Leads</div>
                    <div className="col-span-2 text-center">Convertidos (mês)</div>
                    <div className="col-span-2 text-center">Meta (mês)</div>
                    <div className="col-span-2 text-center">Atingimento</div>
                  </div>
                  {salespeople.map((s) => {
                    const pct = s.monthly_goal > 0 ? Math.min(100, (s.converted_count / s.monthly_goal) * 100) : 0;
                    return (
                      <div key={s.user_id} className="grid grid-cols-12 gap-2 items-center px-3 py-3 border-b border-border/60 text-sm">
                        <div className="col-span-4">
                          <p className="font-medium">{s.full_name || s.username || s.user_id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            Último lead: {s.last_assigned_at ? new Date(s.last_assigned_at).toLocaleString("pt-BR") : "nunca"}
                          </p>
                        </div>
                        <div className="col-span-2 text-center font-semibold">{s.assigned_count}</div>
                        <div className="col-span-2 text-center font-semibold">{s.converted_count}</div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={0}
                            defaultValue={s.monthly_goal}
                            className="h-8 text-center"
                            onBlur={(e) => {
                              const v = Number(e.target.value) || 0;
                              if (v !== s.monthly_goal) saveGoal(s.user_id, v);
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-center text-muted-foreground mt-1">{pct.toFixed(0)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Todos os Leads */}
        <TabsContent value="todos-leads" className="space-y-4">
          <FilterBar />
          <LeadTable rows={filteredLeads} empty="Nenhum lead encontrado com os filtros atuais." />
        </TabsContent>

        {/* Meus Leads */}
        <TabsContent value="meus-leads" className="space-y-4">
          <FilterBar />
          <div className="flex items-center gap-2">
            <Badge variant="outline">Filtrando leads onde você é o dono</Badge>
          </div>
          <LeadTable rows={myLeads} empty="Você ainda não recebeu nenhum lead." />
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="configuracoes">
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Configurações do time</h2>
                  <p className="text-sm text-muted-foreground">Como o sistema se comporta com vários vendedores.</p>
                </div>
                {loadingSettings && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Assinar mensagens no WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Cliente vê quem está respondendo (ex: *João:*).</p>
                </div>
                <Switch checked={signMessages} onCheckedChange={setSignMessages} />
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Textarea value={format} onChange={(e) => setFormat(e.target.value)} rows={3} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {"{nome}"} e {"{msg}"}.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Distribuição automática (round-robin)</p>
                  <p className="text-xs text-muted-foreground">
                    Atribui leads novos em rodízio entre vendedores com permissão de Vendas.
                  </p>
                </div>
                <Switch checked={autoDistribute} onCheckedChange={setAutoDistribute} />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Travar conversa em uso</p>
                  <p className="text-xs text-muted-foreground">
                    Quando A está atendendo, B não consegue mandar mensagem.
                  </p>
                </div>
                <Switch checked={lockConversation} onCheckedChange={setLockConversation} />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label>SLA: alerta após X minutos sem resposta</Label>
                <Input type="number" value={sla} onChange={(e) => setSla(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">
                  Um job roda a cada 5 min e marca conversas onde o vendedor não respondeu dentro desse tempo.
                </p>
              </div>

              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleSaveSettings}
                disabled={savingSettings || loadingSettings}
              >
                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
