import { useEffect, useRef, useState } from "react";
import { Users, BrainCircuit, MessageSquare, Bot, CheckCircle2, Zap, Sparkles, Check } from "lucide-react";
import iconWhatsapp from "@/assets/integrations/whatsapp.png.asset.json";
import iconInstagram from "@/assets/integrations/instagram.png.asset.json";
import iconMeta from "@/assets/integrations/meta.png.asset.json";

const STEPS = [
  { label: "Cadastro", icon: Users, tone: "violet" },
  { label: "Área", icon: BrainCircuit, tone: "cyan" },
  { label: "Canal", icon: MessageSquare, tone: "emerald" },
  { label: "Teste", icon: Bot, tone: "violet" },
  { label: "Pronto!", icon: CheckCircle2, tone: "emerald" },
] as const;

const TONE: Record<string, string> = {
  violet: "bg-[#F3E8FF] text-[#A855F7]",
  cyan: "bg-[#DFF7FA] text-[#22B8CF]",
  emerald: "bg-[#DCFCE7] text-[#10B981]",
};

const STEP_MS = 3600;

/** Máquina de escrever simples */
function useTypewriter(text: string, active: boolean, speed = 55) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) {
      setOut("");
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return out;
}

function StepCadastro({ active }: { active: boolean }) {
  const nome = useTypewriter("João Silva", active);
  const email = useTypewriter("joao@email.com", active, 45);
  const emailStarted = nome === "João Silva";
  return (
    <div className="mt-8 w-full max-w-xs space-y-4">
      <div className="relative rounded-xl border border-slate-200 bg-slate-50/60 px-4 pt-4 pb-3 text-center">
        <span className="text-[10px] text-slate-400">Nome</span>
        <p className="mt-0.5 text-base font-medium text-slate-900">
          {nome}
          <span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-emerald-500 align-middle" />
        </p>
      </div>
      <div className="relative rounded-xl border border-slate-200 bg-slate-50/60 px-4 pt-4 pb-3 text-center">
        <span className="text-[10px] text-slate-400">Email</span>
        <p className="mt-0.5 text-base font-medium text-slate-900">
          {emailStarted ? email : ""}
          {emailStarted && (
            <span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-emerald-500 align-middle" />
          )}
          {!emailStarted && <span className="text-slate-300">&nbsp;</span>}
        </p>
      </div>
    </div>
  );
}

function StepArea({ active }: { active: boolean }) {
  const options = ["Clínica Médica", "Clínica Odontológica", "E-commerce"];
  const [sel, setSel] = useState(-1);
  useEffect(() => {
    if (!active) {
      setSel(-1);
      return;
    }
    const timers = options.map((_, i) => setTimeout(() => setSel(i), 500 + i * 700));
    return () => timers.forEach(clearTimeout);
  }, [active]);
  return (
    <div className="mt-8 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-center text-[10px] text-slate-400">Área</p>
      <div className="mt-2 space-y-1">
        {options.map((o, i) => (
          <div
            key={o}
            className={`rounded-lg py-2 text-center text-sm transition-all duration-300 ${
              sel === i ? "bg-white text-slate-900 shadow-sm scale-[1.02]" : "text-slate-500"
            }`}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCanal({ active }: { active: boolean }) {
  const channels = [
    { label: "WhatsApp", img: iconWhatsapp.url },
    { label: "Instagram", img: iconInstagram.url },
    { label: "Messenger", img: iconMeta.url },
  ];
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (!active) {
      setPicked(false);
      return;
    }
    const t = setTimeout(() => setPicked(true), 900);
    return () => clearTimeout(t);
  }, [active]);
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      {channels.map((c, i) => (
        <div
          key={c.label}
          style={{ animationDelay: `${i * 120}ms` }}
          className={`flex h-[104px] w-[86px] animate-fade-in flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-500 ${
            picked && i === 0
              ? "border-emerald-300 bg-emerald-50/70 shadow-[0_0_0_4px_rgba(16,185,129,0.12)] scale-105"
              : "border-slate-200 bg-white opacity-60"
          }`}
        >
          <img src={c.img} alt={c.label} className="h-7 w-7 object-contain" />
          <span className={`text-[11px] font-medium ${picked && i === 0 ? "text-emerald-600" : "text-slate-400"}`}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function StepTeste({ active }: { active: boolean }) {
  const bubbles = [
    { from: "ai", text: "Olá! Como posso ajudar?" },
    { from: "user", text: "Quero agendar uma consulta" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    const timers = bubbles.map((_, i) => setTimeout(() => setShown(i + 1), 500 + i * 900));
    return () => timers.forEach(clearTimeout);
  }, [active]);
  return (
    <div className="mt-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="space-y-3">
        {bubbles.map((b, i) =>
          shown > i ? (
            <div
              key={b.text}
              className={`flex animate-fade-in items-center gap-2 ${b.from === "user" ? "justify-end" : ""}`}
            >
              {b.from === "ai" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-[#A855F7]">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`rounded-xl px-3 py-2 text-[13px] ${
                  b.from === "ai" ? "bg-[#F3E8FF] text-slate-700" : "bg-[#DCFCE7] text-slate-700"
                }`}
              >
                {b.text}
              </div>
              {b.from === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#10B981]">
                  <Users className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ) : null
        )}
        {shown === 0 && <div className="h-[76px]" />}
      </div>
    </div>
  );
}

function StepPronto({ active }: { active: boolean }) {
  return (
    <div className="mt-6 flex flex-col items-center">
      {active && (
        <>
          <p className="animate-scale-in text-xl font-bold text-emerald-500">Agente criado com sucesso!</p>
          <div className="mt-2 flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <Sparkles
                key={i}
                className="h-4 w-4 animate-fade-in text-amber-400"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OnboardingSteps() {
  const [step, setStep] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(id);
  }, [inView]);

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div ref={ref} className="mx-auto mt-20 max-w-[900px] px-6">
      <div className="relative rounded-t-[20px] border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]">
        {/* Window Header */}
        <div className="flex items-center justify-between rounded-t-[20px] border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="font-mono text-[10px] font-medium tracking-tight text-slate-400">nextpro.tools</div>
          <div className="w-10" />
        </div>

        {/* Conteúdo animado */}
        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-14">
          <div
            key={`icon-${step}`}
            className={`mb-3 flex h-12 w-12 animate-scale-in items-center justify-center rounded-2xl ${TONE[current.tone]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-medium text-slate-500">{current.label}</h3>

          <div key={`body-${step}`} className="w-full animate-fade-in flex flex-col items-center">
            {step === 0 && <StepCadastro active />}
            {step === 1 && <StepArea active />}
            {step === 2 && <StepCanal active />}
            {step === 3 && <StepTeste active />}
            {step === 4 && <StepPronto active />}
          </div>
        </div>

        {/* Ícones flutuantes */}
        <div className="absolute -left-12 top-1/2 hidden -translate-y-1/2 md:block">
          <div className="flex h-10 w-10 animate-[float_4s_ease-in-out_infinite] items-center justify-center rounded-xl border border-emerald-100/50 bg-emerald-50 text-emerald-500 shadow-sm">
            <Zap className="h-5 w-5 fill-current" />
          </div>
        </div>
        <div className="absolute -right-10 top-1/3 hidden md:block">
          <div className="flex h-10 w-10 animate-[float_5s_ease-in-out_infinite] items-center justify-center rounded-xl border border-orange-100/50 bg-orange-50 text-orange-500 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const isActive = i === step;
          const TabIcon = done ? Check : s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setStep(i)}
              className="flex flex-col items-center gap-1"
              aria-label={s.label}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                  isActive
                    ? "scale-110 border-emerald-200 bg-emerald-100 text-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                    : done
                      ? "border-emerald-100 bg-emerald-50 text-emerald-500"
                      : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                }`}
              >
                <TabIcon className="h-4 w-4" />
              </span>
              <span className={`text-[9px] font-bold ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
