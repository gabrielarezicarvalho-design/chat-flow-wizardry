import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  CreditCard, Plus, Pencil, Trash2, DollarSign, Users, 
  MessageSquare, Workflow, RefreshCw, Building2, Bot, 
  Send, FileText, BarChart3, Tags, Headphones, HardDrive,
  Webhook, Zap, Clock, Shield, Check, X
} from "lucide-react";

// Lista de funcionalidades disponíveis
const AVAILABLE_FEATURES = [
  { id: "chat", name: "Chat/Conversas", icon: MessageSquare, description: "Gerenciar conversas com clientes" },
  { id: "flows_basic", name: "Fluxos Básicos", icon: Workflow, description: "Criar fluxos de automação simples" },
  { id: "flows_advanced", name: "Fluxos Avançados", icon: Zap, description: "Fluxos com condições e HTTP" },
  { id: "ai_agents", name: "Agentes de IA", icon: Bot, description: "Atendimento com inteligência artificial" },
  { id: "mass_sending", name: "Disparo em Massa", icon: Send, description: "Envio de mensagens em massa" },
  { id: "smart_forms", name: "Formulários Inteligentes", icon: FileText, description: "Formulários dinâmicos via WhatsApp" },
  { id: "reports", name: "Relatórios", icon: BarChart3, description: "Relatórios e análises detalhadas" },
  { id: "tags", name: "Tags/Etiquetas", icon: Tags, description: "Organização com tags personalizadas" },
  { id: "departments", name: "Departamentos", icon: Headphones, description: "Divisão por departamentos" },
  { id: "google_drive", name: "Google Drive Backup", icon: HardDrive, description: "Backup automático no Drive" },
  { id: "webhooks", name: "Webhooks/API", icon: Webhook, description: "Integração via webhooks e API" },
  { id: "scheduled_messages", name: "Agendamento", icon: Clock, description: "Agendamento de mensagens" },
  { id: "internal_chat", name: "Chat Interno", icon: MessageSquare, description: "Comunicação entre equipe" },
  { id: "leads_management", name: "Gestão de Leads", icon: Users, description: "CRM básico de leads" },
];

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  max_users: number | null;
  max_connections: number | null;
  max_conversations_month: number | null;
  max_flows: number | null;
  is_active: boolean | null;
  features: string[] | null;
  created_at: string | null;
}

export function AdminFaturamento() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [companiesPerPlan, setCompaniesPerPlan] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    max_users: 5,
    max_connections: 2,
    max_conversations_month: 1000,
    max_flows: 10,
    is_active: true,
    features: ["chat", "leads_management", "tags"] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, companiesRes] = await Promise.all([
        supabase.from("subscription_plans").select("*").order("price"),
        supabase.from("companies").select("plan_id")
      ]);

      if (plansRes.data) {
        // Parse features from JSON safely
        const parsedPlans: Plan[] = plansRes.data.map(p => ({
          ...p,
          features: Array.isArray(p.features) 
            ? (p.features as unknown[]).filter((f): f is string => typeof f === 'string')
            : []
        }));
        setPlans(parsedPlans);
      }
      
      // Count companies per plan
      const counts: Record<string, number> = {};
      (companiesRes.data || []).forEach(c => {
        if (c.plan_id) {
          counts[c.plan_id] = (counts[c.plan_id] || 0) + 1;
        }
      });
      setCompaniesPerPlan(counts);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        name: form.name,
        description: form.description || null,
        price: form.price,
        max_users: form.max_users,
        max_connections: form.max_connections,
        max_conversations_month: form.max_conversations_month,
        max_flows: form.max_flows,
        is_active: form.is_active,
        features: form.features
      };

      if (editingPlan) {
        const { error } = await supabase.from("subscription_plans").update(data).eq("id", editingPlan.id);
        if (error) throw error;
        toast.success("Plano atualizado!");
      } else {
        const { error } = await supabase.from("subscription_plans").insert(data);
        if (error) throw error;
        toast.success("Plano criado!");
      }

      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    if (companiesPerPlan[id] > 0) {
      toast.error("Não é possível excluir um plano com empresas vinculadas");
      return;
    }
    if (!confirm("Tem certeza?")) return;
    
    try {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
      toast.success("Plano excluído!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setForm({
      name: "", description: "", price: 0, max_users: 5,
      max_connections: 2, max_conversations_month: 1000, max_flows: 10, is_active: true,
      features: ["chat", "leads_management", "tags"]
    });
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      max_users: plan.max_users || 5,
      max_connections: plan.max_connections || 2,
      max_conversations_month: plan.max_conversations_month || 1000,
      max_flows: plan.max_flows || 10,
      is_active: plan.is_active ?? true,
      features: plan.features || []
    });
    setShowDialog(true);
  };

  const toggleFeature = (featureId: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const selectAllFeatures = () => {
    setForm(prev => ({
      ...prev,
      features: AVAILABLE_FEATURES.map(f => f.id)
    }));
  };

  const clearAllFeatures = () => {
    setForm(prev => ({
      ...prev,
      features: []
    }));
  };

  const totalRevenue = plans.reduce((sum, plan) => {
    const count = companiesPerPlan[plan.id] || 0;
    return sum + (plan.price * count);
  }, 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos & Faturamento</h1>
          <p className="text-slate-400">Gerenciar planos de assinatura e funcionalidades</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowDialog(true); }}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">R$ {totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Receita Mensal Estimada</p>
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
            <Building2 className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{Object.values(companiesPerPlan).reduce((a, b) => a + b, 0)}</p>
              <p className="text-xs text-slate-400">Empresas com Planos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="p-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`p-6 rounded-2xl border ${
                plan.is_active 
                  ? "bg-white/5 border-white/10" 
                  : "bg-slate-900/50 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <Badge className={plan.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}>
                  {plan.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              
              <div className="mb-4">
                <p className="text-3xl font-bold text-white">
                  R$ {plan.price}
                  <span className="text-sm font-normal text-slate-400">/mês</span>
                </p>
                {plan.description && (
                  <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
                )}
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span>{plan.max_users} usuários</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Zap className="h-4 w-4 text-slate-500" />
                  <span>{plan.max_connections} conexões</span>
                </div>
              </div>

              {/* Features badges */}
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Funcionalidades:</p>
                <div className="flex flex-wrap gap-1">
                  {(plan.features || []).slice(0, 5).map(featureId => {
                    const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
                    return feature ? (
                      <Badge key={featureId} variant="outline" className="text-xs border-white/10 text-slate-400">
                        {feature.name}
                      </Badge>
                    ) : null;
                  })}
                  {(plan.features || []).length > 5 && (
                    <Badge variant="outline" className="text-xs border-white/10 text-slate-400">
                      +{(plan.features || []).length - 5}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-sm text-slate-400">
                  {companiesPerPlan[plan.id] || 0} empresa(s)
                </span>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(plan)} className="text-slate-400 hover:text-white h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(plan.id)} className="text-red-400 hover:text-red-300 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: 'calc(90vh - 150px)' }}>
            <div className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-white/5 border-white/10"
                      placeholder="Ex: Plano Pro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (R$) *</Label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="bg-white/5 border-white/10"
                    placeholder="Descrição curta do plano"
                  />
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Limits */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Limites
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Máx. Usuários</Label>
                    <Input
                      type="number"
                      value={form.max_users}
                      onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. Conexões WhatsApp</Label>
                    <Input
                      type="number"
                      value={form.max_connections}
                      onChange={(e) => setForm({ ...form, max_connections: Number(e.target.value) })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Funcionalidades ({form.features.length}/{AVAILABLE_FEATURES.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={selectAllFeatures}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Todos
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={clearAllFeatures}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {AVAILABLE_FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    const isEnabled = form.features.includes(feature.id);
                    return (
                      <div
                        key={feature.id}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                          isEnabled 
                            ? "bg-emerald-500/20 border border-emerald-500/30" 
                            : "bg-white/5 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div 
                          className="flex items-center gap-3 flex-1"
                          onClick={() => toggleFeature(feature.id)}
                        >
                          <div className={`p-2 rounded-lg ${isEnabled ? "bg-emerald-500/20" : "bg-white/10"}`}>
                            <Icon className={`h-4 w-4 ${isEnabled ? "text-emerald-400" : "text-slate-400"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isEnabled ? "text-emerald-400" : "text-white"}`}>
                              {feature.name}
                            </p>
                            <p className="text-xs text-slate-500">{feature.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <Label>Plano Ativo</Label>
                  <p className="text-xs text-slate-500">Disponível para novas empresas</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t border-white/10">
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
