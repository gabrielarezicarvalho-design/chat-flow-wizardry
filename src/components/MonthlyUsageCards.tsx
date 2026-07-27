import { usePlanLimits } from "@/hooks/usePlanLimits";
import type { LimitResource } from "@/lib/planLimits";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Send, Users, DollarSign, Receipt, Bot, GitBranch, Infinity as InfinityIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CARDS: Array<{ resource: LimitResource; label: string; icon: LucideIcon; accent: string }> = [
  { resource: "mass_sends_month", label: "Disparos", icon: Send, accent: "text-blue-600 bg-blue-50" },
  { resource: "contacts_month", label: "Contatos", icon: Users, accent: "text-emerald-600 bg-emerald-50" },
  { resource: "sales_month", label: "Vendas", icon: DollarSign, accent: "text-violet-600 bg-violet-50" },
  { resource: "cobrancas_month", label: "Cobranças", icon: Receipt, accent: "text-amber-600 bg-amber-50" },
  { resource: "agents", label: "Agentes de IA", icon: Bot, accent: "text-fuchsia-600 bg-fuchsia-50" },
  { resource: "flows", label: "Fluxos de IA", icon: GitBranch, accent: "text-cyan-600 bg-cyan-50" },
];

export function MonthlyUsageCards() {
  const { usage, getStatus, isLoading } = usePlanLimits();
  const cycleEnd = usage.cycle_end ? new Date(usage.cycle_end) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Uso do mês</h3>
          <p className="text-xs text-muted-foreground">
            {cycleEnd
              ? `Renova em ${cycleEnd.toLocaleDateString("pt-BR")}`
              : "Consumo do ciclo atual"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CARDS.map((c) => {
          const s = getStatus(c.resource);
          const Icon = c.icon;
          return (
            <Card key={c.resource} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${c.accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {s.blocked && (
                    <span className="text-[10px] font-semibold text-destructive uppercase">
                      Limite
                    </span>
                  )}
                  {s.warning && !s.blocked && (
                    <span className="text-[10px] font-semibold text-amber-600 uppercase">
                      Atenção
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight">
                    {isLoading ? "–" : s.current.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{c.label}</span>
                    <span>·</span>
                    {s.unlimited ? (
                      <span className="flex items-center gap-0.5">
                        de <InfinityIcon className="h-3 w-3" />
                      </span>
                    ) : (
                      <span>de {s.max?.toLocaleString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                {!s.unlimited && (
                  <Progress
                    value={s.percent}
                    className={
                      s.blocked
                        ? "[&>div]:bg-destructive h-1.5"
                        : s.warning
                        ? "[&>div]:bg-amber-500 h-1.5"
                        : "h-1.5"
                    }
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
