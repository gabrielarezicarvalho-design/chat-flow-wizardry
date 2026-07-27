import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Infinity as InfinityIcon } from "lucide-react";

export function PlanUsagePanel() {
  const { plan, usage, allStatuses, isLoading } = usePlanLimits();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Carregando limites do plano…
        </CardContent>
      </Card>
    );
  }

  const statuses = allStatuses();
  const cycleEnd = usage.cycle_end ? new Date(usage.cycle_end) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Uso do plano</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Plano atual: <span className="font-medium capitalize">{plan}</span>
            {cycleEnd && (
              <> · Ciclo até {cycleEnd.toLocaleDateString("pt-BR")}</>
            )}
          </p>
        </div>
        <Badge variant={plan === "business" ? "default" : "secondary"} className="capitalize">
          {plan}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuses.map((s) => (
          <div key={s.resource} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {s.blocked ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : s.warning ? (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                <span className="font-medium">{s.label}</span>
              </div>
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                {s.unlimited ? (
                  <>
                    {s.current} / <InfinityIcon className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    {s.current} / {s.max}
                  </>
                )}
              </span>
            </div>
            {!s.unlimited && (
              <Progress
                value={s.percent}
                className={
                  s.blocked
                    ? "[&>div]:bg-destructive"
                    : s.warning
                    ? "[&>div]:bg-amber-500"
                    : ""
                }
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
