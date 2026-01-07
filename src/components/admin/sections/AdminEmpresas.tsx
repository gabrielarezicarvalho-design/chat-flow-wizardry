import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Building2, Plus, Pencil, Trash2, Lock, Unlock, Search, 
  Eye, RefreshCw, HardDrive, AlertTriangle, CheckCircle, XCircle, UserPlus,
  Database, Loader2, Brain, Key, ExternalLink, Users
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CompanyUsersDialog } from "../CompanyUsersDialog";

// Limites do Supabase principal
const SUPABASE_LIMITS = {
  database: 500 * 1024 * 1024, // 500MB
  storage: 1 * 1024 * 1024 * 1024, // 1GB
  get total() { return this.database + this.storage; }
};

interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  plan_id: string | null;
  google_drive_connected: boolean;
  created_at: string;
  plan?: { name: string } | null;
}

interface Plan {
  id: string;
  name: string;
}

interface CompanyStorageStats {
  conversations: number;
  leads: number;
  messages: number;
  estimatedSize: number;
  percentage: number;
}

interface GlobalStorageStats {
  databaseSize: number;
  storageSize: number;
  totalSize: number;
  dbPercentage: number;
  storagePercentage: number;
  perCompany: Record<string, CompanyStorageStats>;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function AdminEmpresas() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked" | "expired" | "trial">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    plan_id: "",
    expires_at: "",
    trial_ends_at: "",
    is_active: true,
    is_blocked: false,
    blocked_reason: "",
    admin_username: "",
    admin_password: "",
    admin_name: "",
    max_users: 5,
    max_connections: 2,
    // AI Keys
    openai_api_key: "",
    gemini_api_key: "",
    ai_provider: "gemini"
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [availableConnectionsInfo, setAvailableConnectionsInfo] = useState({ available: 0, total: 0 });
  const [storageStats, setStorageStats] = useState<GlobalStorageStats>({
    databaseSize: 0,
    storageSize: 0,
    totalSize: 0,
    dbPercentage: 0,
    storagePercentage: 0,
    perCompany: {}
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Company users dialog state
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [selectedCompanyForUsers, setSelectedCompanyForUsers] = useState<Company | null>(null);

  // Fetch storage stats
  const fetchStorageStats = useCallback(async (companiesList: Company[]) => {
    try {
      const [conversationsRes, leadsRes, messagesRes] = await Promise.all([
        supabase.from("conversations").select("id, user_id"),
        supabase.from("leads").select("id, user_id"),
        supabase.from("messages").select("id, id_da_conversa")
      ]);

      const conversations = conversationsRes.data || [];
      const leads = leadsRes.data || [];
      const messages = messagesRes.data || [];

      // Estimate database size
      const estimatedDbSize = (conversations.length * 500) + (leads.length * 300) + (messages.length * 1024);
      
      // Get storage bucket sizes
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

      // Calculate per-company stats - show total usage for all (not divided)
      const perCompany: Record<string, CompanyStorageStats> = {};

      companiesList.forEach(company => {
        perCompany[company.id] = {
          conversations: conversations.length,
          leads: leads.length,
          messages: messages.length,
          estimatedSize: totalSize, // Show total, not divided
          percentage: Math.round((totalSize / SUPABASE_LIMITS.total) * 100)
        };
      });

      setStorageStats({
        databaseSize: estimatedDbSize,
        storageSize,
        totalSize,
        dbPercentage,
        storagePercentage,
        perCompany
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching storage stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (companies.length > 0) {
        fetchStorageStats(companies);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [companies, fetchStorageStats]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, plansRes] = await Promise.all([
        supabase.from("companies").select("*, plan:subscription_plans(name)").order("created_at", { ascending: false }),
        supabase.from("subscription_plans").select("id, name").eq("is_active", true)
      ]);
      
      const companiesList = (companiesRes.data || []) as unknown as Company[];
      setCompanies(companiesList);
      if (plansRes.data) setPlans(plansRes.data);
      
      // Fetch storage stats after companies are loaded
      await fetchStorageStats(companiesList);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableConnections = async (): Promise<{ available: number; total: number; allocated: number }> => {
    try {
      // Get contract settings
      const { data: contract } = await supabase
        .from("uzapi_contract")
        .select("total_connections")
        .limit(1)
        .maybeSingle();

      const totalConnections = contract?.total_connections || 50;

      // Get total allocated connections from all companies (excluding current if editing)
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, max_connections");

      let allocatedConnections = (companiesData || []).reduce((sum, c: any) => {
        // If editing, exclude current company's connections from the count
        if (editingCompany && c.id === editingCompany.id) return sum;
        return sum + (c.max_connections || 0);
      }, 0);

      return {
        available: totalConnections - allocatedConnections,
        total: totalConnections,
        allocated: allocatedConnections
      };
    } catch (error) {
      console.error("Error getting available connections:", error);
      return { available: 0, total: 50, allocated: 0 };
    }
  };

  const handleSave = async () => {
    try {
      // Validate connections availability
      const { available, total, allocated } = await getAvailableConnections();
      
      if (form.max_connections > available) {
        toast.error(
          `Não há conexões suficientes disponíveis. ` +
          `Disponível: ${available} | Solicitado: ${form.max_connections} | ` +
          `Total do contrato: ${total} | Já alocado: ${allocated}`
        );
        return;
      }

      const data = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        plan_id: form.plan_id || null,
        expires_at: form.expires_at || null,
        trial_ends_at: form.trial_ends_at || null,
        is_active: form.is_active,
        is_blocked: form.is_blocked,
        blocked_reason: form.is_blocked ? form.blocked_reason : null,
        max_users: form.max_users,
        max_connections: form.max_connections,
        openai_api_key: form.openai_api_key || null,
        gemini_api_key: form.gemini_api_key || null,
        ai_provider: form.ai_provider
      };

      let companyId = editingCompany?.id;

      if (editingCompany) {
        const { error } = await supabase.from("companies").update(data).eq("id", editingCompany.id);
        if (error) throw error;
        toast.success("Empresa atualizada!");
      } else {
        const { data: newCompany, error } = await supabase.from("companies").insert(data).select().single();
        if (error) throw error;
        companyId = newCompany.id;
        toast.success("Empresa criada!");

        // Create admin user if credentials provided
        if (form.admin_username && form.admin_password && companyId) {
          await createCompanyAdmin(companyId);
        }
      }

      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar");
    }
  };

  const createCompanyAdmin = async (companyId: string) => {
    if (!form.admin_username || !form.admin_password) {
      toast.error("Preencha usuário e senha do admin");
      return;
    }

    setCreatingAdmin(true);
    try {
      // First, find and delete all existing admins for this company
      const { data: existingAdmins, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('company_id', companyId)
        .eq('is_company_admin', true);

      if (fetchError) {
        console.error("Error fetching existing admins:", fetchError);
      }

      // Delete existing admins (except if it's the same username being updated)
      if (existingAdmins && existingAdmins.length > 0) {
        for (const admin of existingAdmins) {
          // Skip if it's the same username (updating password only)
          if (admin.username === form.admin_username) continue;
          
          console.log("Deleting old admin:", admin.id, admin.username);
          const { error: deleteError } = await supabase.functions.invoke("delete-user", {
            body: { user_id: admin.id }
          });
          
          if (deleteError) {
            console.error("Error deleting old admin:", deleteError);
          } else {
            console.log("Old admin deleted successfully:", admin.username);
          }
        }
      }

      // Now create the new admin
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          username: form.admin_username,
          full_name: form.admin_name || form.admin_username,
          password: form.admin_password,
          role: "admin",
          company_id: companyId,
          is_company_admin: true
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update the profile to mark as company admin
      if (data?.user_id) {
        await supabase
          .from('profiles')
          .update({ is_company_admin: true })
          .eq('id', data.user_id);
      }

      toast.success("Admin da empresa criado/atualizado!");
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast.error(error.message || "Erro ao criar admin");
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Check if there are users linked to this company
    const { data: linkedUsers, error: checkError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("company_id", id);
    
    if (checkError) {
      toast.error("Erro ao verificar usuários vinculados");
      return;
    }

    if (linkedUsers && linkedUsers.length > 0) {
      const confirmWithUsers = confirm(
        `Esta empresa possui ${linkedUsers.length} usuário(s) vinculado(s).\n\n` +
        `Os usuários serão desvinculados (company_id será removido).\n\n` +
        `Deseja continuar?`
      );
      if (!confirmWithUsers) return;

      // Unlink all users first
      const { error: unlinkError } = await supabase
        .from("profiles")
        .update({ company_id: null, is_company_admin: false })
        .eq("company_id", id);
      
      if (unlinkError) {
        toast.error("Erro ao desvincular usuários");
        return;
      }
    } else {
      if (!confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;
    }
    
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      toast.success("Empresa excluída!");
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erro ao excluir");
    }
  };

  const handleToggleBlock = async (company: Company) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ 
          is_blocked: !company.is_blocked,
          blocked_reason: !company.is_blocked ? "Bloqueado pelo administrador" : null
        })
        .eq("id", company.id);
      if (error) throw error;
      toast.success(company.is_blocked ? "Empresa desbloqueada!" : "Empresa bloqueada!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  };

  const resetForm = () => {
    setEditingCompany(null);
    setForm({
      name: "", email: "", phone: "", plan_id: "",
      expires_at: "", trial_ends_at: "", is_active: true, is_blocked: false, blocked_reason: "",
      admin_username: "", admin_password: "", admin_name: "",
      max_users: 5, max_connections: 2,
      openai_api_key: "", gemini_api_key: "", ai_provider: "gemini"
    });
  };

  const loadAvailableConnections = async (excludeCompanyId?: string) => {
    try {
      const { data: contract } = await supabase
        .from("uzapi_contract")
        .select("total_connections")
        .limit(1)
        .maybeSingle();

      const totalConnections = contract?.total_connections || 50;

      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, max_connections");

      let allocatedConnections = (companiesData || []).reduce((sum, c: any) => {
        if (excludeCompanyId && c.id === excludeCompanyId) return sum;
        return sum + (c.max_connections || 0);
      }, 0);

      setAvailableConnectionsInfo({
        available: totalConnections - allocatedConnections,
        total: totalConnections
      });
    } catch (error) {
      console.error("Error loading available connections:", error);
    }
  };

  const openEdit = (company: Company) => {
    setEditingCompany(company);
    setForm({
      name: company.name,
      email: company.email || "",
      phone: company.phone || "",
      plan_id: company.plan_id || "",
      expires_at: company.expires_at ? company.expires_at.split("T")[0] : "",
      trial_ends_at: company.trial_ends_at ? company.trial_ends_at.split("T")[0] : "",
      is_active: company.is_active,
      is_blocked: company.is_blocked,
      blocked_reason: company.blocked_reason || "",
      admin_username: "", admin_password: "", admin_name: "",
      max_users: (company as any).max_users ?? 5,
      max_connections: (company as any).max_connections ?? 2,
      openai_api_key: (company as any).openai_api_key || "",
      gemini_api_key: (company as any).gemini_api_key || "",
      ai_provider: (company as any).ai_provider || "gemini"
    });
    loadAvailableConnections(company.id);
    setShowDialog(true);
  };

  const openNewCompany = () => {
    resetForm();
    loadAvailableConnections();
    setShowDialog(true);
  };

  const getStatus = (company: Company) => {
    if (company.is_blocked) return { label: "Bloqueada", color: "bg-red-500/20 text-red-400" };
    if (company.expires_at && isPast(new Date(company.expires_at))) return { label: "Vencida", color: "bg-red-500/20 text-red-400" };
    if (company.trial_ends_at && !isPast(new Date(company.trial_ends_at))) return { label: "Trial", color: "bg-purple-500/20 text-purple-400" };
    if (company.is_active) return { label: "Ativa", color: "bg-emerald-500/20 text-emerald-400" };
    return { label: "Inativa", color: "bg-slate-500/20 text-slate-400" };
  };

  const getExpiryInfo = (date: string | null) => {
    if (!date) return null;
    const expiry = new Date(date);
    const days = differenceInDays(expiry, new Date());
    
    if (isPast(expiry)) return { text: "Vencido", color: "text-red-400" };
    if (days <= 7) return { text: `${days}d restantes`, color: "text-amber-400" };
    return { text: format(expiry, "dd/MM/yyyy", { locale: ptBR }), color: "text-slate-400" };
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (filterStatus) {
      case "active": return c.is_active && !c.is_blocked;
      case "blocked": return c.is_blocked;
      case "expired": return c.expires_at && isPast(new Date(c.expires_at));
      case "trial": return c.trial_ends_at && !isPast(new Date(c.trial_ends_at));
      default: return true;
    }
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-slate-400">Gerenciar clientes da plataforma</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Atualizado: {format(lastUpdate, "HH:mm:ss")}
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => fetchStorageStats(companies)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={openNewCompany}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Global Storage Stats */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HardDrive className="h-6 w-6 text-violet-400" />
            <div>
              <h3 className="font-semibold text-white">Armazenamento Total</h3>
              <p className="text-sm text-slate-400">
                {formatBytes(storageStats.totalSize)} de {formatBytes(SUPABASE_LIMITS.total)} ({Math.max(storageStats.dbPercentage, storageStats.storagePercentage)}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-cyan-400">{formatBytes(storageStats.databaseSize)}</p>
              <p className="text-xs text-slate-500">Database</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-400">{formatBytes(storageStats.storageSize)}</p>
              <p className="text-xs text-slate-500">Storage</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{companies.length > 0 ? formatBytes(storageStats.totalSize / companies.length) : '0 B'}</p>
              <p className="text-xs text-slate-500">Média/Empresa</p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Database (500 MB)</span>
              <span>{storageStats.dbPercentage}%</span>
            </div>
            <Progress value={storageStats.dbPercentage} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Storage (1 GB)</span>
              <span>{storageStats.storagePercentage}%</span>
            </div>
            <Progress value={storageStats.storagePercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="blocked">Bloqueadas</SelectItem>
            <SelectItem value="expired">Vencidas</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: companies.length, color: "text-white" },
          { label: "Ativas", value: companies.filter(c => c.is_active && !c.is_blocked).length, color: "text-emerald-400" },
          { label: "Bloqueadas", value: companies.filter(c => c.is_blocked).length, color: "text-red-400" },
          { label: "Vencidas", value: companies.filter(c => c.expires_at && isPast(new Date(c.expires_at))).length, color: "text-amber-400" },
          { label: "Trial", value: companies.filter(c => c.trial_ends_at && !isPast(new Date(c.trial_ends_at))).length, color: "text-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Empresa</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Plano</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Vencimento</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Armazenamento</th>
                <th className="text-right p-4 text-sm font-medium text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              ) : filteredCompanies.map((company) => {
                const status = getStatus(company);
                const expiry = getExpiryInfo(company.expires_at);
                const companyStorage = storageStats.perCompany[company.id];
                return (
                  <tr key={company.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-white">{company.name}</p>
                        <p className="text-sm text-slate-400">{company.email || "—"}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300">{company.plan?.name || "Sem plano"}</span>
                    </td>
                    <td className="p-4">
                      <Badge className={status.color}>{status.label}</Badge>
                    </td>
                    <td className="p-4">
                      {expiry ? (
                        <span className={expiry.color}>{expiry.text}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-cyan-400" />
                                <span className="text-white font-medium">
                                  {companyStorage ? formatBytes(companyStorage.estimatedSize) : '0 B'}
                                </span>
                              </div>
                              <Progress 
                                value={companyStorage?.percentage || 0} 
                                className="h-1.5 w-24" 
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="bg-slate-800 border-slate-700">
                            <div className="space-y-1 text-xs">
                              <p>Conversas: {companyStorage?.conversations || 0}</p>
                              <p>Leads: {companyStorage?.leads || 0}</p>
                              <p>Mensagens: {companyStorage?.messages || 0}</p>
                              <p className="font-medium text-cyan-400">
                                {companyStorage?.percentage || 0}% do total
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(company)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleBlock(company)}
                          className={company.is_blocked ? "text-emerald-400" : "text-amber-400"}
                        >
                          {company.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCompanyForUsers(company);
                            setShowUsersDialog(true);
                          }}
                          className="text-cyan-400 hover:text-cyan-300"
                          title="Ver usuários da empresa"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(company.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/5">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="ia">Chaves IA</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máx. Usuários</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.max_users}
                    onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Máx. Conexões WhatsApp</Label>
                    {(() => {
                      // When editing, the available should include the current company's allocation
                      const currentCompanyConnections = editingCompany ? ((editingCompany as any).max_connections || 0) : 0;
                      const effectiveAvailable = availableConnectionsInfo.available + currentCompanyConnections;
                      return (
                        <span className={`text-xs ${effectiveAvailable >= form.max_connections ? 'text-emerald-400' : 'text-red-400'}`}>
                          Disponível: {effectiveAvailable} / {availableConnectionsInfo.total}
                        </span>
                      );
                    })()}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={availableConnectionsInfo.available + (editingCompany ? ((editingCompany as any).max_connections || 0) : 0)}
                    value={form.max_connections}
                    onChange={(e) => setForm({ ...form, max_connections: Number(e.target.value) })}
                    className={`bg-white/5 border-white/10 ${form.max_connections > (availableConnectionsInfo.available + (editingCompany ? ((editingCompany as any).max_connections || 0) : 0)) ? 'border-red-500' : ''}`}
                  />
                  {form.max_connections > (availableConnectionsInfo.available + (editingCompany ? ((editingCompany as any).max_connections || 0) : 0)) && (
                    <p className="text-xs text-red-400">
                      ⚠️ Excede o limite disponível no contrato UZAPI
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <Label>Empresa Ativa</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <Label className="text-red-400">Bloqueada</Label>
                <Switch
                  checked={form.is_blocked}
                  onCheckedChange={(v) => setForm({ ...form, is_blocked: v })}
                />
              </div>
              {form.is_blocked && (
                <div className="space-y-2">
                  <Label>Motivo do Bloqueio</Label>
                  <Textarea
                    value={form.blocked_reason}
                    onChange={(e) => setForm({ ...form, blocked_reason: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="ia" className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-purple-400 mb-1">Chaves de IA Externas</h3>
                    <p className="text-sm text-slate-300">
                      Configure as chaves de API diretamente das plataformas Google e OpenAI.
                      A empresa gerencia seus próprios custos direto nos dashboards dos provedores.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Provedor Padrão
                </Label>
                <Select value={form.ai_provider} onValueChange={(v) => setForm({ ...form, ai_provider: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI ChatGPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-cyan-400" />
                    Google Gemini API Key
                  </Label>
                  <a 
                    href="https://aistudio.google.com/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Obter chave <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder="AIza..."
                  value={form.gemini_api_key}
                  onChange={(e) => setForm({ ...form, gemini_api_key: e.target.value })}
                  className="bg-white/5 border-white/10 font-mono"
                />
                {form.gemini_api_key && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Chave configurada
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-emerald-400" />
                    OpenAI API Key
                  </Label>
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    Obter chave <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={form.openai_api_key}
                  onChange={(e) => setForm({ ...form, openai_api_key: e.target.value })}
                  className="bg-white/5 border-white/10 font-mono"
                />
                {form.openai_api_key && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Chave configurada
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Os custos de uso da IA são cobrados diretamente pela Google/OpenAI na conta do cliente.
                  Acompanhe o uso nos dashboards:
                </p>
                <div className="flex gap-4 mt-2">
                  <a 
                    href="https://aistudio.google.com/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Google AI Studio →
                  </a>
                  <a 
                    href="https://platform.openai.com/usage" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    OpenAI Usage →
                  </a>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-purple-400" />
                <Label className="text-purple-400 font-semibold">
                  {editingCompany ? "Gerenciar Acesso da Empresa" : "Criar Admin da Empresa"}
                </Label>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Admin</Label>
                  <Input
                    placeholder="Nome completo"
                    value={form.admin_name}
                    onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usuário (email) *</Label>
                  <Input
                    placeholder="admin@empresa.com"
                    value={form.admin_username}
                    onChange={(e) => setForm({ ...form, admin_username: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{editingCompany ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.admin_password}
                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                {editingCompany && (form.admin_username || form.admin_password) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => createCompanyAdmin(editingCompany.id)}
                    disabled={creatingAdmin}
                    className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    {creatingAdmin ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar/Atualizar Usuário Admin
                      </>
                    )}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Users Dialog */}
      {selectedCompanyForUsers && (
        <CompanyUsersDialog
          open={showUsersDialog}
          onOpenChange={setShowUsersDialog}
          companyId={selectedCompanyForUsers.id}
          companyName={selectedCompanyForUsers.name}
        />
      )}
    </div>
  );
}
