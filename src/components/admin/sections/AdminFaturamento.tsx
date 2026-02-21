import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  CreditCard, DollarSign, Users, Building2, RefreshCw, Zap,
  Plus, Pencil, Trash2, Loader2, X
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  max_users: number;
  max_connections: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

interface PlanStats {
  planSlug: string;
  count: number;
}

const ALL_FEATURES = [
  { id: "chat", label: "Chat" },
  { id: "flows_basic", label: "Fluxos Básicos" },
  { id: "flows_advanced", label: "Fluxos Avançados" },
  { id: "ai_agents", label: "Agentes IA" },
  { id: "mass_sending", label: "Envio em Massa" },
  { id: "smart_forms", label: "Formulários Inteligentes" },
  { id: "reports", label: "Relatórios" },
  { id: "tags", label: "Tags" },
  { id: "departments", label: "Departamentos" },
  { id: "google_drive", label: "Google Drive" },
  { id: "webhooks", label: "Webhooks" },
  { id: "scheduled_messages", label: "Mensagens Agendadas" },
  { id: "internal_chat", label: "Chat Interno" },
  { id: "leads_management", label: "Gestão de Leads" },
  { id: "multi_connection", label: "Multi-Conexão" },
];

export function AdminFaturamento() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    price: 0,
    max_users: 10,
    max_connections: 3,
    features: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, companiesRes] = await Promise.all([
        supabase.from("subscription_plans").select("*").order("price", { ascending: true }),
        supabase.from("companies").select("id, plan"),
      ]);

      if (plansRes.error) throw plansRes.error;
      setPlans(plansRes.data || []);

      const companies = companiesRes.data || [];
      setTotalCompanies(companies.length);

      const stats: Record<string, number> = {};
      companies.forEach(c => {
        const plan = c.plan || 'basic';
        stats[plan] = (stats[plan] || 0) + 1;
      });
      setPlanStats(Object.entries(stats).map(([planSlug, count]) => ({ planSlug, count })));
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setForm({ name: "", slug: "", price: 0, max_users: 10, max_connections: 3, features: [], is_active: true });
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      max_users: plan.max_users,
      max_connections: plan.max_connections,
      features: plan.features || [],
      is_active: plan.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        slug: form.slug.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        price: form.price,
        max_users: form.max_users,
        max_connections: form.max_connections,
        features: form.features,
        is_active: form.is_active,
      };

      if (editingPlan) {
        const { error } = await supabase.from("subscription_plans").update(data).eq("id", editingPlan.id);
        if (error) throw error;

        // Update all companies using this plan with new limits
        const { error: companyError } = await supabase
          .from("companies")
          .update({ max_users: data.max_users, max_connections: data.max_connections })
          .eq("plan", editingPlan.slug);
        if (companyError) console.error("Error updating companies:", companyError);

        toast.success("Plano atualizado!");
      } else {
        const { error } = await supabase.from("subscription_plans").insert(data);
        if (error) throw error;
        toast.success("Plano criado!");
      }

      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    const usedCount = planStats.find(s => s.planSlug === plan.slug)?.count || 0;
    if (usedCount > 0) {
      toast.error(`Não é possível excluir: ${usedCount} empresa(s) usando este plano`);
      return;
    }
    if (!confirm(`Excluir plano "${plan.name}"?`)) return;
    try {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", plan.id);
      if (error) throw error;
      toast.success("Plano excluído!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir plano");
    }
  };

  const toggleFeature = (featureId: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos & Faturamento</h1>
          <p className="text-slate-400">Gerencie planos de assinatura e seus limites</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchData} variant="outline" className="border-white/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalCompanies}</p>
              <p className="text-xs text-slate-400">Total de Empresas</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-white">{plans.length}</p>
              <p className="text-xs text-slate-400">Planos Disponíveis</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">—</p>
              <p className="text-xs text-slate-400">Receita (em breve)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="p-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white/5 rounded-xl border border-white/10">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">Nenhum plano criado</p>
          <p className="text-sm text-slate-500 mt-1">Clique em "Novo Plano" para criar o primeiro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const count = planStats.find(p => p.planSlug === plan.slug)?.count || 0;
            return (
              <div key={plan.id} className="p-6 rounded-2xl border bg-white/5 border-white/10 relative group">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(plan)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <Badge className={plan.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                    {plan.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold text-white">
                    R$ {plan.price}<span className="text-sm font-normal text-slate-400">/mês</span>
                  </p>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span>{plan.max_connections === 999 ? "Ilimitado" : `${plan.max_connections} conexões`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span>{plan.max_users === 999 ? "Ilimitado" : `${plan.max_users} usuários`}</span>
                  </div>
                  {plan.features.slice(0, 3).map(f => {
                    const feat = ALL_FEATURES.find(af => af.id === f);
                    return feat ? (
                      <div key={f} className="flex items-center gap-2 text-slate-300">
                        <Zap className="h-4 w-4 text-emerald-400" />
                        <span>{feat.label}</span>
                      </div>
                    ) : null;
                  })}
                  {plan.features.length > 3 && (
                    <p className="text-xs text-slate-500 pl-6">+{plan.features.length - 3} mais</p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{count} empresa(s)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingPlan ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                  className="bg-white/5 border-white/10"
                  placeholder="Ex: Pro"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="bg-white/5 border-white/10"
                  placeholder="pro"
                  disabled={!!editingPlan}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number" min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. Usuários</Label>
                <Input
                  type="number" min={1}
                  value={form.max_users}
                  onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. Conexões</Label>
                <Input
                  type="number" min={1}
                  value={form.max_connections}
                  onChange={(e) => setForm({ ...form, max_connections: Number(e.target.value) })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Funcionalidades</Label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-white/5 border border-white/10 max-h-48 overflow-y-auto">
                {ALL_FEATURES.map(feat => (
                  <label key={feat.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={form.features.includes(feat.id)}
                      onChange={() => toggleFeature(feat.id)}
                      className="rounded border-white/20 bg-white/10 text-emerald-500"
                    />
                    <span className={form.features.includes(feat.id) ? "text-white" : "text-slate-400"}>{feat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <Label>Plano Ativo</Label>
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-white/20 text-white">Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.slug}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPlan ? "Salvar" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminFaturamento;
