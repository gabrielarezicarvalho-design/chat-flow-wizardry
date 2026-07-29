import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sliders, Save, Loader2, Infinity as InfinityIcon, RefreshCw } from "lucide-react";
import { LimitResource, RESOURCE_LABELS } from "@/lib/planLimits";
import { usePlanConfigs, PlanConfig, normalizeLimits } from "@/hooks/usePlanConfigs";

const RESOURCES = Object.keys(RESOURCE_LABELS) as LimitResource[];

export function AdminPlanos() {
  const { plans, isLoading, refetch } = usePlanConfigs();
  const [draft, setDraft] = useState<PlanConfig[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setDraft(plans);
  }, [plans]);

  const update = (slug: string, patch: Partial<PlanConfig>) =>
    setDraft((d) => d.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));

  const updateLimit = (slug: string, res: LimitResource, value: number | null) =>
    setDraft((d) =>
      d.map((p) =>
        p.slug === slug ? { ...p, limits: { ...p.limits, [res]: value } } : p
      )
    );

  const save = async (plan: PlanConfig) => {
    setSaving(plan.slug);
    const { error } = await supabase.from("plan_limits").upsert({
      slug: plan.slug,
      name: plan.name,
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      limits: normalizeLimits(plan.limits, plan.slug) as unknown as Record<string, number | null>,
    });
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(`Plano ${plan.name} atualizado. Limites e cobrança sincronizados.`);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" />
            Limites por Plano
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina disparos, conexões, agentes e demais limites de cada plano. Os valores
            valem imediatamente para o bloqueio de acesso e para o preço cobrado no checkout.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Recarregar
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {draft.map((plan) => (
          <div key={plan.slug} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Input
                  value={plan.name}
                  onChange={(e) => update(plan.slug, { name: e.target.value })}
                  className="h-8 w-36 font-semibold"
                />
                <Badge variant="secondary">{plan.slug}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Ativo</Label>
                <Switch
                  checked={plan.is_active}
                  onCheckedChange={(v) => update(plan.slug, { is_active: v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Preço mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.price_monthly}
                  onChange={(e) =>
                    update(plan.slug, { price_monthly: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço anual/mês (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={plan.price_annual}
                  onChange={(e) =>
                    update(plan.slug, { price_annual: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              {RESOURCES.map((res) => {
                const value = plan.limits[res];
                const unlimited = value === null || value === undefined;
                return (
                  <div key={res} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground flex-1">
                      {RESOURCE_LABELS[res]}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      disabled={unlimited}
                      value={unlimited ? "" : (value as number)}
                      placeholder="∞"
                      onChange={(e) =>
                        updateLimit(
                          plan.slug,
                          res,
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      className="h-8 w-24 text-right"
                    />
                    <Button
                      type="button"
                      variant={unlimited ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      title="Ilimitado"
                      onClick={() => updateLimit(plan.slug, res, unlimited ? 0 : null)}
                    >
                      <InfinityIcon className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full"
              onClick={() => save(plan)}
              disabled={saving === plan.slug}
            >
              {saving === plan.slug ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar plano
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPlanos;
