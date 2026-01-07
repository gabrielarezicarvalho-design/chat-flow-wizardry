import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  FileText, Server, Wifi, Building2, AlertTriangle, 
  CheckCircle, Settings, RefreshCw, Loader2, Save
} from "lucide-react";

interface ContractSettings {
  id: string;
  plan_name: string;
  total_connections: number;
  contract_start: string | null;
  contract_end: string | null;
  monthly_cost: number;
}

interface ConnectionUsage {
  total_allocated: number;
  total_active: number;
  companies_with_connections: number;
}

export function AdminContrato() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [connectionUsage, setConnectionUsage] = useState<ConnectionUsage>({
    total_allocated: 0,
    total_active: 0,
    companies_with_connections: 0
  });
  const [settings, setSettings] = useState<ContractSettings>({
    id: "",
    plan_name: "Plano Enterprise",
    total_connections: 50,
    contract_start: null,
    contract_end: null,
    monthly_cost: 0
  });
  const [form, setForm] = useState<ContractSettings>({ ...settings });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch contract settings from database
      const { data: contractData, error: contractError } = await supabase
        .from("uzapi_contract")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (contractError) throw contractError;

      if (contractData) {
        const contractSettings: ContractSettings = {
          id: contractData.id,
          plan_name: contractData.plan_name,
          total_connections: contractData.total_connections,
          contract_start: contractData.contract_start,
          contract_end: contractData.contract_end,
          monthly_cost: Number(contractData.monthly_cost) || 0
        };
        setSettings(contractSettings);
        setForm(contractSettings);
      }

      // Fetch connection usage from companies
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, max_connections, is_active");

      // Fetch active connections
      const { data: connections } = await supabase
        .from("connections")
        .select("id, user_id, status");

      const totalAllocated = (companies || []).reduce((sum, c: any) => sum + (c.max_connections || 0), 0);
      const totalActive = (connections || []).filter((c: any) => c.status === "connected").length;
      const companiesWithConnections = (companies || []).filter((c: any) => c.max_connections > 0).length;

      setConnectionUsage({
        total_allocated: totalAllocated,
        total_active: totalActive,
        companies_with_connections: companiesWithConnections
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados do contrato");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        plan_name: form.plan_name,
        total_connections: form.total_connections,
        contract_start: form.contract_start || null,
        contract_end: form.contract_end || null,
        monthly_cost: form.monthly_cost,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        const { error } = await supabase
          .from("uzapi_contract")
          .update(updateData)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("uzapi_contract")
          .insert(updateData);
        if (error) throw error;
      }

      setSettings({ ...form });
      setShowDialog(false);
      toast.success("Configurações do contrato salvas!");
      fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const availableConnections = settings.total_connections - connectionUsage.total_allocated;
  const usagePercentage = settings.total_connections > 0 
    ? Math.round((connectionUsage.total_allocated / settings.total_connections) * 100) 
    : 0;
  const activePercentage = settings.total_connections > 0 
    ? Math.round((connectionUsage.total_active / settings.total_connections) * 100) 
    : 0;

  const getStatusColor = () => {
    if (usagePercentage >= 90) return "text-red-400";
    if (usagePercentage >= 70) return "text-amber-400";
    return "text-emerald-400";
  };

  const getProgressColor = () => {
    if (usagePercentage >= 90) return "bg-red-500";
    if (usagePercentage >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Contrato UZAPI</h1>
          <p className="text-slate-400">Gerenciar conexões WhatsApp do seu pacote</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={() => { setForm({ ...settings }); setShowDialog(true); }}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Contrato
          </Button>
        </div>
      </div>

      {/* Contract Summary */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-500/20 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{settings.plan_name}</h2>
              <p className="text-slate-400">
                {settings.contract_start && settings.contract_end
                  ? `${new Date(settings.contract_start).toLocaleDateString('pt-BR')} - ${new Date(settings.contract_end).toLocaleDateString('pt-BR')}`
                  : "Período não configurado"}
              </p>
              {settings.monthly_cost > 0 && (
                <p className="text-emerald-400 font-semibold">
                  R$ {settings.monthly_cost.toLocaleString('pt-BR')}/mês
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{settings.total_connections}</p>
              <p className="text-sm text-slate-400">Total Contratado</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${getStatusColor()}`}>{availableConnections}</p>
              <p className="text-sm text-slate-400">Disponíveis</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Server className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{settings.total_connections}</p>
              <p className="text-sm text-slate-400">Total Contratado</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{connectionUsage.total_allocated}</p>
              <p className="text-sm text-slate-400">Alocado p/ Empresas</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Wifi className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{connectionUsage.total_active}</p>
              <p className="text-sm text-slate-400">Ativas Agora</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl ${availableConnections > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
              {availableConnections > 0 
                ? <CheckCircle className="h-6 w-6 text-emerald-400" />
                : <AlertTriangle className="h-6 w-6 text-red-400" />
              }
            </div>
            <div>
              <p className={`text-2xl font-bold ${availableConnections > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {availableConnections}
              </p>
              <p className="text-sm text-slate-400">Disponíveis</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card className="bg-white/5 border-white/10 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Uso do Contrato</h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Conexões Alocadas</span>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {connectionUsage.total_allocated} / {settings.total_connections} ({usagePercentage}%)
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor()} transition-all duration-500`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Conexões Ativas</span>
              <span className="text-sm font-medium text-cyan-400">
                {connectionUsage.total_active} / {settings.total_connections} ({activePercentage}%)
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${Math.min(activePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {usagePercentage >= 90 && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-400">
              Você está próximo do limite do seu contrato. Considere fazer um upgrade.
            </p>
          </div>
        )}
      </Card>

      {/* Companies Distribution */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Distribuição por Empresas</h3>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
            {connectionUsage.companies_with_connections} empresas
          </Badge>
        </div>
        <p className="text-slate-400 text-sm">
          As conexões estão distribuídas entre {connectionUsage.companies_with_connections} empresas.
          Cada empresa tem um limite configurado individualmente na seção de Empresas.
        </p>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Contrato UZAPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Plano</Label>
              <Input
                value={form.plan_name}
                onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="Ex: Plano Enterprise"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Total de Conexões Contratadas *</Label>
              <Input
                type="number"
                min={1}
                value={form.total_connections}
                onChange={(e) => setForm({ ...form, total_connections: Number(e.target.value) })}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-slate-500">
                Quantas conexões WhatsApp seu pacote UZAPI permite
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início do Contrato</Label>
                <Input
                  type="date"
                  value={form.contract_start || ""}
                  onChange={(e) => setForm({ ...form, contract_start: e.target.value || null })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Fim do Contrato</Label>
                <Input
                  type="date"
                  value={form.contract_end || ""}
                  onChange={(e) => setForm({ ...form, contract_end: e.target.value || null })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custo Mensal (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.monthly_cost}
                onChange={(e) => setForm({ ...form, monthly_cost: Number(e.target.value) })}
                className="bg-white/5 border-white/10"
                placeholder="0.00"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-400">
                ⚠️ Certifique-se de configurar o total correto de conexões do seu contrato UZAPI 
                para evitar alocar mais do que o disponível.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-white/20 text-white">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
