import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CreditCard, DollarSign, Users, Building2, RefreshCw, Zap
} from "lucide-react";

interface PlanStats {
  planName: string;
  count: number;
}

export function AdminFaturamento() {
  const [loading, setLoading] = useState(true);
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, plan, is_active");

      if (error) throw error;

      const stats: Record<string, number> = {};
      (companies || []).forEach(c => {
        const plan = c.plan || 'basic';
        stats[plan] = (stats[plan] || 0) + 1;
      });

      setPlanStats(Object.entries(stats).map(([planName, count]) => ({ planName, count })));
      setTotalCompanies(companies?.length || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const defaultPlans = [
    { name: "Basic", price: 97, features: ["3 conexões", "10 usuários", "Fluxos básicos"] },
    { name: "Pro", price: 197, features: ["5 conexões", "25 usuários", "Agentes IA"] },
    { name: "Enterprise", price: 397, features: ["Ilimitado", "Suporte prioritário", "White Label"] }
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos & Faturamento</h1>
          <p className="text-slate-400">Visão geral dos planos e empresas</p>
        </div>
        <Button 
          onClick={fetchData}
          variant="outline"
          className="border-white/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
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
              <p className="text-2xl font-bold text-white">{defaultPlans.length}</p>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {defaultPlans.map((plan) => {
            const count = planStats.find(p => p.planName.toLowerCase() === plan.name.toLowerCase())?.count || 0;
            return (
              <div 
                key={plan.name}
                className="p-6 rounded-2xl border bg-white/5 border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <Badge className="bg-emerald-500/20 text-emerald-400">Ativo</Badge>
                </div>
                
                <div className="mb-4">
                  <p className="text-3xl font-bold text-white">
                    R$ {plan.price}
                    <span className="text-sm font-normal text-slate-400">/mês</span>
                  </p>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-slate-300">
                      <Zap className="h-4 w-4 text-emerald-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
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

      {/* Info */}
      <div className="mt-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-sm text-amber-300">
          💡 Para gerenciar planos personalizados, será necessário criar a tabela subscription_plans no banco de dados.
        </p>
      </div>
    </div>
  );
}

export default AdminFaturamento;
