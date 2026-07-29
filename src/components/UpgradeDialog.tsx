import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Rocket, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";
import { usePlanLimits, TRIAL_DAYS } from "@/hooks/usePlanLimits";
import { Progress } from "@/components/ui/progress";

const EVENT = "open-upgrade-dialog";

export function openUpgradeDialog(reason?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason } }));
}

type Billing = "monthly" | "annual";

const PLANS = [
  {
    tier: "start" as const,
    name: "Start",
    monthly: 49.9,
    annual: 41.58,
    icon: Rocket,
    highlight: "150 vendas e 100 disparos por mês",
    features: [
      "5 atendentes e 2 conexões WhatsApp",
      "100 disparos em massa/mês",
      "IA completa, fluxos e departamentos",
      "Relatórios e histórico de atendimentos",
    ],
  },
  {
    tier: "business" as const,
    name: "Business",
    monthly: 99.9,
    annual: 83.25,
    icon: Crown,
    popular: true,
    highlight: "10.000 disparos/mês e recursos ilimitados",
    features: [
      "20 atendentes e 10 conexões WhatsApp",
      "Vendas, cobranças, fluxos e agentes ilimitados",
      "Prospecção Google Maps, Instagram e TikTok",
      "Espionar anúncios + suporte prioritário",
    ],
  },
];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function UpgradeDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [billing, setBilling] = useState<Billing>("monthly");
  const { plans: planConfigs } = usePlanConfigs();
  const { plan: currentPlan, usage, getStatus, trialEndsAt, trialExpired, trialDaysLeft } = usePlanLimits();
  const sends = getStatus("mass_sends_month");
  const remaining = sends.unlimited
    ? null
    : Math.max(0, (sends.max as number) - sends.current);
  const resetAt = usage?.cycle_end
    ? new Date(usage.cycle_end).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  useEffect(() => {
    const handler = (e: Event) => {
      setReason((e as CustomEvent).detail?.reason);
      setBilling("monthly");
      setOpen(true);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const go = (tier: string) => {
    setOpen(false);
    navigate(`/checkout?tier=${tier}&billing=${billing}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#004DFF]" />
            Libere mais recursos com um upgrade
          </DialogTitle>
          <DialogDescription>
            {reason ||
              "Seu plano atual atingiu o limite. Escolha um plano e continue usando sem interrupções."}
          </DialogDescription>
        </DialogHeader>

        {trialEndsAt && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              trialExpired
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-amber-300/60 bg-amber-50 text-amber-800"
            }`}
          >
            {trialExpired
              ? `Seu teste grátis de ${TRIAL_DAYS} dias terminou e todas as funcionalidades estão bloqueadas.`
              : `Teste grátis de ${TRIAL_DAYS} dias — resta${trialDaysLeft === 1 ? "" : "m"} ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} (até ${trialEndsAt.toLocaleDateString("pt-BR")}).`}
          </div>
        )}

        <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Disparos no plano {currentPlan}
            </span>
            <span className="text-muted-foreground">
              {sends.unlimited
                ? "Ilimitados"
                : `${sends.current}/${sends.max} usados`}
            </span>
          </div>
          {!sends.unlimited && (
            <>
              <Progress value={sends.percent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Você ainda tem{" "}
                <span className="font-semibold text-foreground">
                  {remaining} disparo{remaining === 1 ? "" : "s"}
                </span>{" "}
                {resetAt
                  ? `— o limite reinicia em ${resetAt} (próximo ciclo de cobrança).`
                  : "no ciclo atual."}
              </p>
            </>
          )}
        </div>

        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border p-1 bg-muted/40">
            {(["monthly", "annual"] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  billing === b
                    ? "bg-[#004DFF] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b === "monthly" ? "Mensal" : "Anual (-17%)"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 items-start">
          {PLANS.map((p) => {
            const Icon = p.icon;
            const cfg = planConfigs.find((c) => c.slug === p.tier);
            const monthly = cfg?.price_monthly ?? p.monthly;
            const annual = cfg?.price_annual ?? p.annual;
            const price = billing === "annual" ? annual : monthly;
            return (
              <div
                key={p.tier}
                className={`rounded-xl border p-5 space-y-4 ${
                  p.popular ? "border-[#004DFF] shadow-md" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Icon className="h-4 w-4 text-[#004DFF]" />
                    {cfg?.name || p.name}
                  </div>
                  {p.popular && (
                    <Badge className="bg-[#004DFF] hover:bg-[#004DFF]">
                      Mais escolhido
                    </Badge>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold inline-flex items-baseline gap-1">
                    {brl(price)}
                    <span className="text-xs text-muted-foreground font-normal">
                      /mês {billing === "annual" ? `— ${brl(price * 12)} cobrado por ano` : ""}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#004DFF]/5 text-[#004DFF] text-xs font-medium px-3 py-2">
                  {p.highlight}
                </div>
                <ul className="space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="h-4 w-4 text-[#004DFF] shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full rounded-xl"
                  variant={p.popular ? "default" : "outline"}
                  onClick={() => go(p.tier)}
                >
                  Assinar {cfg?.name || p.name}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Upgrade imediato — seus limites são liberados assim que o pagamento é confirmado.
        </p>
      </DialogContent>
    </Dialog>
  );
}
