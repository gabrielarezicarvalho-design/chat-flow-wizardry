import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Check, Copy, ShieldCheck, ArrowRight, Package, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";

type Tier = "start" | "business";
type Billing = "monthly" | "annual";

const PLANS: Record<Tier, { name: string; monthly: number; annual: number; features: string[] }> = {
  start: {
    name: "Start",
    monthly: 49.9,
    annual: 41.58,
    features: [
      "5 atendentes",
      "2 conexões WhatsApp",
      "IA completa",
      "100 disparos em massa/mês",
      "500 contatos/mês",
      "Histórico de atendimentos",
      "Relatórios",
      "500 vendas e cobranças/mês",
      "3 fluxos de IA/mês",
      "3 agentes de IA/mês",
      "4 departamentos/mês",
      "Segmentação de contatos",
      "Chat interno",
      "10 usuários/mês",
    ],
  },
  business: {
    name: "Business",
    monthly: 99.9,
    annual: 83.25,
    features: [
      "20 atendentes",
      "10 conexões WhatsApp",
      "IA completa",
      "Até 10.000 disparos em massa/mês",
      "10.000 contatos/mês",
      "Vendas e cobranças ilimitadas",
      "Fluxos e agentes de IA ilimitados",
      "Departamentos ilimitados",
      "Segmentação de contatos",
      "Chat interno",
      "Prospecção Google Maps, Instagram e TikTok",
      "Espionar anúncios",
      "Suporte prioritário",
    ],
  },
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const onlyDigits = (s: string) => s.replace(/\D+/g, "");
const maskCPF = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const maskPhone = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tier = (params.get("tier") as Tier) === "business" ? "business" : "start";
  const billing = (params.get("billing") as Billing) === "annual" ? "annual" : "monthly";

  const { plans: planConfigs } = usePlanConfigs();
  const configured = planConfigs.find((p) => p.slug === tier);
  const plan = {
    ...PLANS[tier],
    name: configured?.name || PLANS[tier].name,
    monthly: configured?.price_monthly ?? PLANS[tier].monthly,
    annual: configured?.price_annual ?? PLANS[tier].annual,
  };
  const total = billing === "annual" ? plan.annual * 12 : plan.monthly;
  const billingLabel = billing === "annual" ? "Anual (12 meses)" : "Mensal (recorrente)";

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "" });
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setForm((f) => ({ ...f, email: f.email || data.user!.email! }));
      }
    })();
  }, []);

  const discount = couponApplied ? total * 0.1 : 0;
  const finalTotal = Math.max(0, total - discount);

  const applyCoupon = () => {
    if (!coupon.trim()) return;
    setCouponApplied(true);
    toast.success("Cupom aplicado — 10% de desconto");
  };

  const canContinueStep2 =
    form.name.trim().length > 2 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    onlyDigits(form.phone).length >= 10;

  const canPay = onlyDigits(form.cpf).length === 11;

  const generatePayment = async () => {
    try {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        navigate(`/auth?redirect=${encodeURIComponent(`/checkout?tier=${tier}&billing=${billing}`)}`);
        return;
      }
      const { data, error } = await supabase.functions.invoke("platform-subscription-create", {
        body: { tier, billing, backUrl: `${window.location.origin}/home?subscription=success` },
      });
      if (error) throw error;
      if (data?.init_point) setInitPoint(data.init_point as string);
      // Simulated PIX code (BR Code style) for display; real PIX is opened via Mercado Pago link.
      const fakePix = `00020126${Math.random().toString(36).slice(2, 10).toUpperCase()}5204000053039865802BR5910NEXT PRO6009SAO PAULO62070503***6304${Math.random()
        .toString(16)
        .slice(2, 6)
        .toUpperCase()}`;
      setPixCode(fakePix);
      setStep(4);
    } catch (e) {
      console.error(e);
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const qrSrc = useMemo(() => {
    const value = pixCode || `${window.location.origin}/checkout?tier=${tier}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(value)}`;
  }, [pixCode, tier]);

  const steps = [
    { n: 1, label: "Plano" },
    { n: 2, label: "Dados" },
    { n: 3, label: "Pagamento" },
    { n: 4, label: "Pronto" },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "#004DFF" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 4l16 16M20 4L4 20" strokeLinecap="round" />
              </svg>
            </div>
          </button>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Lock className="h-3 w-3" /> Checkout seguro
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Finalize sua assinatura</h1>
          <p className="mt-1 text-sm text-slate-500">Leva menos de 2 minutos.</p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-3xl bg-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden">
          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 p-6 border-b border-slate-100">
            {steps.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <div key={s.n} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-2 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition ${
                        active
                          ? "text-white"
                          : done
                          ? "text-white"
                          : "bg-slate-900 text-white"
                      }`}
                      style={active || done ? { backgroundColor: "#004DFF" } : undefined}
                    >
                      {done ? <Check className="h-4 w-4" /> : s.n}
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        active ? "" : "text-slate-500"
                      }`}
                      style={active ? { color: "#004DFF" } : undefined}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-[2px] ${done ? "" : "bg-slate-200"}`} style={done ? { backgroundColor: "#004DFF" } : undefined} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          <div className="p-6 md:p-8">
            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900">Escolha seu plano</h2>
                <p className="text-sm text-slate-500">Selecione a opção que melhor se encaixa pra você.</p>

                {/* Plan pill */}
                <div className="mt-6 rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center" style={{ color: "#004DFF" }}>
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{plan.name.toUpperCase()}</div>
                      <div className="text-xs text-slate-500">{billingLabel}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{brl(total)}</div>
                </div>

                {/* Coupon */}
                <div className="mt-6">
                  <label className="text-xs font-semibold text-slate-600">Cupom de desconto</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={applyCoupon}
                      className="rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponApplied && (
                    <p className="mt-2 text-xs font-medium" style={{ color: "#004DFF" }}>
                      Cupom aplicado — 10% off ({brl(discount)})
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Você está levando</div>
                      <div className="text-lg font-bold text-slate-900">{plan.name.toUpperCase()}</div>
                      <div className="text-xs text-slate-500">{billingLabel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="text-2xl font-bold text-slate-900">{brl(finalTotal)}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <ul className="grid grid-cols-1 gap-2 text-sm text-slate-700">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-4 w-4" style={{ color: "#004DFF" }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-blue-50/60 border border-blue-100 p-4 flex gap-3 text-sm text-slate-700">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#004DFF" }} />
                  <p>
                    Ative em segundos após o pagamento. Você pode cancelar quando quiser direto em <b>Minha Conta</b>.
                  </p>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="mt-6 w-full rounded-xl text-white font-semibold py-4 flex items-center justify-center gap-2 transition hover:opacity-90"
                  style={{ backgroundColor: "#004DFF" }}
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900">Seus dados</h2>
                <p className="text-sm text-slate-500">Usamos para emitir a nota e liberar seu acesso.</p>

                <div className="mt-6 grid gap-4">
                  <Field label="Nome completo *">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                      placeholder="Como está no seu documento"
                    />
                  </Field>
                  <Field label="E-mail *">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                      placeholder="voce@email.com"
                    />
                  </Field>
                  <Field label="Telefone / WhatsApp *">
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                      placeholder="(11) 99999-9999"
                    />
                  </Field>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canContinueStep2}
                    className="flex-1 rounded-xl text-white font-semibold py-3 flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#004DFF" }}
                  >
                    Continuar <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 text-center">Pagamento via PIX</h2>
                <p className="text-sm text-slate-500 text-center">Escaneie o QR Code no app do seu banco.</p>

                <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                  <div className="text-sm font-bold text-slate-900">Confirme seus dados</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Precisamos desses dados para emitir a cobrança. Ficam salvos no seu perfil.
                  </p>

                  <div className="mt-4">
                    <label className="text-xs font-semibold text-slate-600">CPF *</label>
                    <input
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <button
                    onClick={generatePayment}
                    disabled={!canPay || loading}
                    className="mt-5 w-full rounded-xl text-white font-semibold py-3 flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#004DFF" }}
                  >
                    {loading ? "Gerando cobrança…" : "Continuar para pagamento"}
                  </button>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
                >
                  Voltar
                </button>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 text-center">Pagamento via PIX</h2>
                <p className="text-sm text-slate-500 text-center">Escaneie o QR Code no app do seu banco.</p>

                <div className="mt-6 rounded-2xl border border-slate-200 p-6">
                  <div className="flex justify-center">
                    <div className="rounded-2xl bg-white p-3 border border-slate-100">
                      <img src={qrSrc} alt="QR Code PIX" className="h-64 w-64" />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (pixCode) {
                        navigator.clipboard.writeText(pixCode);
                        toast.success("Código PIX copiado");
                      }
                    }}
                    className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2"
                  >
                    <Copy className="h-4 w-4" /> Copiar código PIX
                  </button>

                  <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Plano</span>
                      <span className="font-semibold text-slate-900">{plan.name.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Detalhes</span>
                      <span className="font-semibold text-slate-900">{billingLabel}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-900 font-semibold">Total</span>
                      <span className="font-bold text-slate-900">{brl(finalTotal)}</span>
                    </div>
                  </div>
                </div>

                {initPoint && (
                  <a
                    href={initPoint}
                    className="mt-4 block w-full rounded-xl text-white font-semibold py-3 text-center transition hover:opacity-90"
                    style={{ backgroundColor: "#004DFF" }}
                  >
                    Abrir pagamento no Mercado Pago
                  </a>
                )}

                <div className="mt-4 rounded-2xl bg-blue-50/60 border border-blue-100 p-4 flex gap-3 text-xs text-slate-600">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#004DFF" }} />
                  <p>
                    Após a confirmação do PIX, sua assinatura é liberada automaticamente. Você pode acompanhar em <b>Minha Conta</b>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          Pagamento processado com segurança · Seus dados são criptografados
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
