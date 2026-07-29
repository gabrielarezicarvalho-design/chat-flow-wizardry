import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Building2, Plus, Pencil, Trash2, Lock, Unlock, Search, 
  RefreshCw, Loader2, CheckCircle, XCircle, User, Eye, EyeOff, MessageSquare, Shield,
  Globe, HardDrive
} from "lucide-react";
import { CompanyWhatsAppConnections } from "@/components/admin/CompanyWhatsAppConnections";

interface Company {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  max_users: number;
  max_connections: number;
  plan: string;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  max_users: number;
  max_connections: number;
  features: string[];
  is_active: boolean;
}

export function AdminEmpresas() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCompanyForWA, setSelectedCompanyForWA] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    is_active: true,
    max_users: 10,
    max_connections: 3,
    storage_limit: 9,
    plan: "basic",
    admin_username: "",
    admin_password: "",
    admin_full_name: "",
    features: null as string[] | null,
    useCustomFeatures: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, plansRes] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("price", { ascending: true }),
      ]);
      
      if (companiesRes.error) throw companiesRes.error;
      setCompanies(companiesRes.data || []);
      setPlans(plansRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planSlug: string) => {
    const selectedPlan = plans.find(p => p.slug === planSlug);
    if (selectedPlan) {
      setForm(prev => ({
        ...prev,
        plan: planSlug,
        max_users: selectedPlan.max_users,
        max_connections: selectedPlan.max_connections,
      }));
    } else {
      setForm(prev => ({ ...prev, plan: planSlug }));
    }
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!editingCompany) {
      if (!form.admin_username) {
        toast.error("Usuário do administrador é obrigatório");
        return;
      }
      if (!form.admin_password || form.admin_password.length < 6) {
        toast.error("Senha deve ter no mínimo 6 caracteres");
        return;
      }
    }

    setSaving(true);
    try {
      const data: any = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        is_active: form.is_active,
        max_users: form.max_users,
        max_connections: form.max_connections,
        storage_limit: form.storage_limit,
        plan: form.plan,
        features: form.useCustomFeatures ? form.features : null
      };

      if (editingCompany) {
        const { error } = await supabase.from("companies").update(data).eq("id", editingCompany.id);
        if (error) throw error;
        toast.success("Empresa atualizada!");
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from("companies")
          .insert(data)
          .select()
          .single();
        
        if (companyError) throw companyError;

        const { data: adminResult, error: adminError } = await supabase.functions.invoke('create-admin-user', {
          body: {
            secret_key: "NEXTPRO_ADMIN_SETUP_2026",
            username: form.admin_username,
            password: form.admin_password,
            full_name: form.admin_full_name || form.admin_username,
            company_id: newCompany.id,
            is_company_admin: true
          }
        });

        if (adminError) {
          await supabase.from("companies").delete().eq("id", newCompany.id);
          throw new Error("Erro ao criar administrador: " + adminError.message);
        }

        toast.success(`Empresa criada! Admin: ${form.admin_username}`);
      }

      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      toast.success("Empresa excluída!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      const { error } = await supabase.from("companies").update({ is_active: !company.is_active }).eq("id", company.id);
      if (error) throw error;
      toast.success(company.is_active ? "Empresa desativada!" : "Empresa ativada!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  };

  const resetForm = () => {
    setEditingCompany(null);
    const defaultPlan = plans.length > 0 ? plans[0] : null;
    setForm({
      name: "",
      slug: "",
      is_active: true,
      max_users: defaultPlan?.max_users || 10,
      max_connections: defaultPlan?.max_connections || 3,
      storage_limit: 9,
      plan: defaultPlan?.slug || "basic",
      admin_username: "",
      admin_password: "",
      admin_full_name: "",
      features: null,
      useCustomFeatures: false
    });
    setShowPassword(false);
  };

  const openEdit = async (company: Company) => {
    setEditingCompany(company);
    
    // Fetch company features and storage_limit
    const { data: companyFull } = await supabase
      .from("companies")
      .select("features, storage_limit")
      .eq("id", company.id)
      .single();
    
    const companyFeatures = (companyFull as any)?.features as string[] | null;
    const storageLimit = (companyFull as any)?.storage_limit as number ?? 9;
    const selectedPlan = plans.find(p => p.slug === company.plan);
    
    setForm({
      name: company.name,
      slug: company.slug || "",
      is_active: company.is_active,
      max_users: company.max_users,
      max_connections: company.max_connections,
      storage_limit: storageLimit,
      plan: company.plan,
      admin_username: "",
      admin_password: "",
      admin_full_name: "",
      features: companyFeatures || selectedPlan?.features || [],
      useCustomFeatures: !!companyFeatures
    });
    setShowDialog(true);
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanName = (slug: string) => {
    const plan = plans.find(p => p.slug === slug);
    return plan?.name || slug;
  };

  if (selectedCompanyForWA) {
    return (
      <CompanyWhatsAppConnections
        companyId={selectedCompanyForWA.id}
        companyName={selectedCompanyForWA.name}
        onBack={() => setSelectedCompanyForWA(null)}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-slate-400">Gerenciamento de empresas clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} className="border-white/20 text-white hover:bg-white/10" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <p className="text-2xl font-bold text-white">{companies.length}</p>
          <p className="text-xs text-slate-400">Total de Empresas</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
          <p className="text-2xl font-bold text-white">{companies.filter(c => c.is_active).length}</p>
          <p className="text-xs text-slate-400">Empresas Ativas</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <p className="text-2xl font-bold text-white">{companies.filter(c => !c.is_active).length}</p>
          <p className="text-xs text-slate-400">Empresas Inativas</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white/5 border-white/10 text-white max-w-md" />
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" /></div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white/5 rounded-xl border border-white/10">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">Nenhuma empresa encontrada</p>
          <p className="text-sm text-slate-500 mt-1">Clique em "Nova Empresa" para criar a primeira</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Empresa</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Plano</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Limites</th>
                <th className="text-left p-4 text-sm font-medium text-slate-300">Status</th>
                <th className="text-right p-4 text-sm font-medium text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{company.name}</p>
                        <p className="text-sm text-slate-400">{company.slug || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className="bg-purple-500/20 text-purple-400">{getPlanName(company.plan)}</Badge>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-300">{company.max_users} usuários</p>
                    <p className="text-xs text-slate-500">{company.max_connections} conexões</p>
                    <p className="text-xs text-slate-500">{(company as any).storage_limit || 9}GB storage</p>
                  </td>
                  <td className="p-4">
                    {company.is_active ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400"><CheckCircle className="h-3 w-3 mr-1" />Ativa</Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Inativa</Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setSelectedCompanyForWA(company)} className="h-8 w-8" title="Conexões WhatsApp">
                        <MessageSquare className="h-4 w-4 text-emerald-400" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleToggleActive(company)} className="h-8 w-8">
                        {company.is_active ? <Lock className="h-4 w-4 text-amber-400" /> : <Unlock className="h-4 w-4 text-emerald-400" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(company)} className="h-8 w-8">
                        <Pencil className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(company.id)} className="text-red-400 hover:text-red-300 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10" placeholder="Ex: Empresa XYZ" />
            </div>
            
            {/* Subdomain Configuration */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-400" />
                <Label>Subdomínio</Label>
              </div>
              <div className="flex items-center gap-0">
                <Input 
                  value={form.slug} 
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} 
                  className="bg-white/5 border-white/10 rounded-r-none" 
                  placeholder="empresa-xyz" 
                />
                <span className="px-3 py-2 bg-white/10 border border-white/10 border-l-0 rounded-r-md text-xs text-slate-400 whitespace-nowrap">
                  .nextprochat.com.br
                </span>
              </div>
              <p className="text-xs text-slate-500">
                URL de acesso: <span className="text-cyan-400">{form.slug || 'empresa'}.nextprochat.com.br</span>
              </p>
            </div>

            {/* Plan Selector */}
            <div className="space-y-2">
              <Label>Plano *</Label>
              <Select value={form.plan} onValueChange={handlePlanChange}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  {plans.map(plan => (
                    <SelectItem key={plan.slug} value={plan.slug} className="text-white focus:bg-white/10 focus:text-white">
                      <div className="flex items-center gap-2">
                        <span>{plan.name}</span>
                        <span className="text-xs text-slate-400">— R$ {plan.price}/mês • {plan.max_users} usuários • {plan.max_connections} conexões</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Máx. Usuários</Label>
                <Input type="number" min={1} value={form.max_users} onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })} className="bg-white/5 border-white/10" />
                <p className="text-xs text-slate-500">Preenchido pelo plano</p>
              </div>
              <div className="space-y-2">
                <Label>Máx. Conexões</Label>
                <Input type="number" min={1} value={form.max_connections} onChange={(e) => setForm({ ...form, max_connections: Number(e.target.value) })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3 text-emerald-400" />
                  <Label>Storage (GB)</Label>
                </div>
                <Input type="number" min={1} max={100} value={form.storage_limit} onChange={(e) => setForm({ ...form, storage_limit: Number(e.target.value) })} className="bg-white/5 border-white/10" />
                <p className="text-xs text-slate-500">{form.storage_limit}GB na VPS</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <Label>Empresa Ativa</Label>
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
            </div>

            {/* Feature Permissions */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold text-white">Permissões Customizadas</h3>
                </div>
                <Switch 
                  checked={form.useCustomFeatures} 
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const selectedPlan = plans.find(p => p.slug === form.plan);
                      setForm({ ...form, useCustomFeatures: true, features: form.features?.length ? form.features : (selectedPlan?.features || []) });
                    } else {
                      setForm({ ...form, useCustomFeatures: false, features: null });
                    }
                  }} 
                />
              </div>
              {!form.useCustomFeatures && (
                <p className="text-xs text-slate-500 mb-2">Usando permissões do plano selecionado. Ative para customizar.</p>
              )}
              {form.useCustomFeatures && (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "chat", label: "💬 Chat / Conversas" },
                    { id: "mass_sending", label: "📢 Disparos em Massa" },
                    { id: "flows_basic", label: "🔄 Fluxos Básicos" },
                    { id: "flows_advanced", label: "⚡ Fluxos Avançados" },
                    { id: "ai_agents", label: "🤖 Agentes de IA" },
                    { id: "smart_forms", label: "📝 Formulários" },
                    { id: "reports", label: "📊 Relatórios" },
                    { id: "tags", label: "🏷️ Tags" },
                    { id: "departments", label: "🏢 Departamentos" },
                    { id: "leads_management", label: "👥 Gestão de Leads" },
                    { id: "internal_chat", label: "💬 Chat Interno" },
                    { id: "multi_connection", label: "🔗 Multi Conexão" },
                    { id: "chatgpt_credits", label: "🧠 ChatGPT" },
                    { id: "google_drive", label: "☁️ Google Drive" },
                    { id: "webhooks", label: "🔌 Webhooks/API" },
                    { id: "scheduled_messages", label: "⏰ Agendamento" },
                  ] as { id: string; label: string }[]).map(feat => (
                    <div key={feat.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-xs text-slate-300">{feat.label}</span>
                      <Switch
                        checked={form.features?.includes(feat.id) || false}
                        onCheckedChange={(checked) => {
                          const current = form.features || [];
                          setForm({
                            ...form,
                            features: checked
                              ? [...current, feat.id]
                              : current.filter(f => f !== feat.id)
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin User Section */}
            {!editingCompany && (
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">Administrador da Empresa</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input value={form.admin_full_name} onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })} className="bg-white/5 border-white/10" placeholder="Nome do administrador" />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuário de Login *</Label>
                    <Input value={form.admin_username} onChange={(e) => setForm({ ...form, admin_username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} className="bg-white/5 border-white/10" placeholder="admin_empresa" />
                    <p className="text-xs text-slate-500">Apenas letras minúsculas, números e underscore</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} className="bg-white/5 border-white/10 pr-10" placeholder="Mínimo 6 caracteres" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-white/20 text-white">Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || (!editingCompany && (!form.admin_username || form.admin_password.length < 6))}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCompany ? "Salvar" : "Criar Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
