import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { RESOURCE_LABELS, type LimitResource } from "@/lib/planLimits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Infinity as InfinityIcon, Crown, Calendar, CreditCard, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORIES: { title: string; items: LimitResource[] }[] = [
  {
    title: "Equipe e acessos",
    items: ["users", "attendants", "departments"],
  },
  {
    title: "Canais e IA",
    items: ["connections", "agents", "flows"],
  },
  {
    title: "Uso mensal",
    items: ["mass_sends_month", "contacts_month", "sales_month", "cobrancas_month"],
  },
];

export default function MyAccount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan, usage, getStatus, isLoading } = usePlanLimits();

  const { data: subscription } = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (!profile?.company_id) return null;
      const { data } = await supabase
        .from("platform_subscriptions")
        .select("tier, billing, amount, status, current_period_end, last_payment_at")
        .eq("company_id", profile.company_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const tier = (subscription?.tier || plan || "start").toLowerCase();
  const billing = (subscription?.billing || "monthly").toLowerCase();
  const isBusiness = tier === "business";
  const cycleEnd = usage.cycle_end ? new Date(usage.cycle_end) : null;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minha Conta</h1>
          <p className="text-sm text-muted-foreground">
            Resumo do seu plano, recorrência e limites atuais.
          </p>
        </div>
        <Button onClick={() => navigate("/")}>
          Ver uso e planos <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Plan summary */}
      <Card className="overflow-hidden">
        <div
          className={`h-1.5 w-full ${
            isBusiness ? "bg-gradient-to-r from-blue-600 to-violet-600" : "bg-blue-500"
          }`}
        />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                  isBusiness ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="capitalize text-xl">
                  Plano {tier}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBusiness
                    ? "Recursos completos para operações em escala"
                    : "Ideal para começar sua operação"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isBusiness ? "default" : "secondary"} className="capitalize">
                {tier}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {billing === "annual" ? "Anual" : "Mensal"}
              </Badge>
              {subscription?.status && (
                <Badge
                  variant={subscription.status === "authorized" ? "default" : "outline"}
                  className="capitalize"
                >
                  {subscription.status === "authorized" ? "Ativa" : subscription.status}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Valor
            </div>
            <div className="text-lg font-semibold mt-1">
              {subscription?.amount
                ? `R$ ${Number(subscription.amount).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}`
                : isBusiness
                ? billing === "annual"
                  ? "R$ 999,00"
                  : "R$ 99,90"
                : billing === "annual"
                ? "R$ 499,00"
                : "R$ 49,90"}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                /{billing === "annual" ? "ano" : "mês"}
              </span>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Próxima renovação
            </div>
            <div className="text-lg font-semibold mt-1">
              {periodEnd
                ? periodEnd.toLocaleDateString("pt-BR")
                : cycleEnd
                ? cycleEnd.toLocaleDateString("pt-BR")
                : "—"}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Último pagamento
            </div>
            <div className="text-lg font-semibold mt-1">
              {subscription?.last_payment_at
                ? new Date(subscription.last_payment_at).toLocaleDateString("pt-BR")
                : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      {CATEGORIES.map((cat) => (
        <Card key={cat.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{cat.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cat.items.map((r) => {
              const s = getStatus(r);
              return (
                <div key={r} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{RESOURCE_LABELS[r]}</span>
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      {isLoading ? (
                        "…"
                      ) : s.unlimited ? (
                        <>
                          {s.current} / <InfinityIcon className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          {s.current.toLocaleString("pt-BR")} /{" "}
                          {s.max?.toLocaleString("pt-BR")}
                        </>
                      )}
                    </span>
                  </div>
                  {!s.unlimited && (
                    <Progress
                      value={s.percent}
                      className={
                        s.blocked
                          ? "[&>div]:bg-destructive h-2"
                          : s.warning
                          ? "[&>div]:bg-amber-500 h-2"
                          : "h-2"
                      }
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {!isBusiness && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold">Precisa de mais recursos?</div>
              <p className="text-sm text-muted-foreground">
                Faça upgrade para o plano Business com IA, disparos e departamentos ilimitados.
              </p>
            </div>
            <Button onClick={() => navigate("/")}>Fazer upgrade</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
