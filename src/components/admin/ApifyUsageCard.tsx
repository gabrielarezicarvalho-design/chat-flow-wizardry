import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, RefreshCw, Zap } from "lucide-react";

interface ApifyUsage {
  plan?: string;
  monthlyUsageUsd?: number;
  monthlyLimitUsd?: number | null;
  percent?: number | null;
  computeUnits?: number | null;
  username?: string;
  billingPeriodEnd?: string | null;
  error?: string;
}

export function ApifyUsageCard() {
  const [data, setData] = useState<ApifyUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("apify-usage");
      if (error) throw error;
      setData(res as ApifyUsage);
    } catch (e: any) {
      setData({ error: e.message || "Falha ao consultar Apify" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const percent = data?.percent ?? null;
  const warn = percent !== null && percent >= 70 && percent < 90;
  const critical = percent !== null && percent >= 90;
  const barColor = critical ? "bg-red-500" : warn ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="p-5 rounded-lg bg-white/5 border border-white/10 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Zap className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Apify — Uso do Plano</h3>
            <p className="text-xs text-slate-400">
              Créditos consumidos no ciclo atual pelos scrapers (Instagram, etc.)
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-white/10" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {data?.error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{data.error}</span>
        </div>
      )}

      {!data?.error && data && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="border-white/10 text-slate-200">
              Plano: {data.plan || "—"}
            </Badge>
            {data.username && (
              <Badge variant="outline" className="border-white/10 text-slate-200">
                @{data.username}
              </Badge>
            )}
            {critical && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" /> Crítico — {percent!.toFixed(0)}%
              </Badge>
            )}
            {warn && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                Atenção — {percent!.toFixed(0)}%
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">
                <Activity className="h-3.5 w-3.5 inline mr-1" />
                Uso mensal
              </span>
              <span className="text-white font-mono">
                ${(data.monthlyUsageUsd ?? 0).toFixed(2)}
                {data.monthlyLimitUsd ? ` / $${data.monthlyLimitUsd.toFixed(2)}` : ""}
              </span>
            </div>
            {percent !== null && (
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-md bg-white/5">
              <div className="text-xs text-slate-400">Compute Units</div>
              <div className="text-white font-mono text-lg">
                {data.computeUnits != null ? Number(data.computeUnits).toFixed(2) : "—"}
              </div>
            </div>
            <div className="p-3 rounded-md bg-white/5">
              <div className="text-xs text-slate-400">Restante</div>
              <div className="text-white font-mono text-lg">
                {data.monthlyLimitUsd
                  ? `$${Math.max(0, data.monthlyLimitUsd - (data.monthlyUsageUsd ?? 0)).toFixed(2)}`
                  : "—"}
              </div>
            </div>
          </div>

          {critical && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-200">
              ⚠️ Você atingiu {percent!.toFixed(0)}% do limite do plano Apify. Novas extrações podem falhar. Considere fazer upgrade ou aguardar o próximo ciclo.
            </div>
          )}
          {warn && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
              ℹ️ Uso acima de 70% — monitore extrações grandes para evitar bloqueio.
            </div>
          )}
        </>
      )}
    </div>
  );
}
