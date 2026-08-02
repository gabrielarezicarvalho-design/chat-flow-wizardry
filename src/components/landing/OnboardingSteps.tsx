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

/** Máquina de escrever com ritmo humano e cursor piscante */
function useTypewriter(text: string, active: boolean, baseSpeed = 55) {
  const [out, setOut] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!active) {
      setOut("");
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeNext = () => {
      if (i >= text.length) {
        setIsTyping(false);
        return;
      }
      i += 1;
      setOut(text.slice(0, i));
      // Ritmo humano: varia entre 30ms e 130ms
      const variance = Math.floor(Math.random() * 100) - 30;
      const delay = Math.max(30, baseSpeed + variance);
      timeoutId = setTimeout(typeNext, delay);
    };

    timeoutId = setTimeout(typeNext, 350);
    return () => clearTimeout(timeoutId);
  }, [text, active, baseSpeed]);

  return { text: out, isTyping };
}

function StepCadastro({ active }: { active: boolean }) {
  const { text: nome, isTyping: typingNome } = useTypewriter("João Silva", active, 65);
  const nomeDone = nome === "João Silva";
  const { text: email, isTyping: typingEmail } = useTypewriter(
    "joao@email.com",
    active && nomeDone,
    50
  );

  return (
    <div className="mt-8 w-full max-w-xs space-y-4">
      <div
        className={`relative rounded-xl border bg-slate-50/60 px-4 pt-4 pb-3 text-center transition-all duration-300 ${
          active
            ? "border-blue-300 shadow-[0_0_0_3px_rgba(0,77,255,0.08)]"
            : "border-slate-200"
        }`}
      >
        <span className="block text-[10px] text-slate-400">Nome</span>
        <p className="mt-1 min-h-[1.5rem] text-base font-medium text-slate-900">
          {nome}
          <span
            className={`ml-0.5 inline-block h-4 w-[2px] align-middle bg-blue-500 transition-opacity duration-200 ${
              typingNome ? "opacity-100 animate-pulse" : "opacity-0"
            }`}
          />
        </p>
      </div>
      <div
        className={`relative rounded-xl border bg-slate-50/60 px-4 pt-4 pb-3 text-center transition-all duration-300 ${
          nomeDone && active
            ? "border-blue-300 shadow-[0_0_0_3px_rgba(0,77,255,0.08)]"
            : "border-slate-200"
        }`}
      >
        <span className="block text-[10px] text-slate-400">Email</span>
        <p className="mt-1 min-h-[1.5rem] text-base font-medium text-slate-900">
          {nomeDone ? email : ""}
          <span
            className={`ml-0.5 inline-block h-4 w-[2px] align-middle bg-blue-500 transition-opacity duration-200 ${
              nomeDone && typingEmail ? "opacity-100 animate-pulse" : "opacity-0"
            }`}
          />
          {!nomeDone && <span className="text-slate-300">&nbsp;</span>}
        </p>
      </div>
    </div>
  );
}

function StepArea({ active }: { active: boolean }) {
  const options = ["Clínica Médica", "Clínica Odontológica", "E-commerce"];
  const [sel, setSel] = useState(-1);
  const [hovered, setHovered] = useState(-1);

  useEffect(() => {
    if (!active) {
      setSel(-1);
      setHovered(-1);
      return;
    }
    // Efeito de "passar o mouse" rápido antes de selecionar
    const timers = [
      setTimeout(() => setHovered(0), 400),
      setTimeout(() => setHovered(1), 800),
      setTimeout(() => setHovered(2), 1200),
      setTimeout(() => {
        setHovered(-1);
        setSel(1); // Seleciona a do meio
      }, 1600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="mt-8 w-full max-w-[280px] space-y-4">
      <div
        className={`relative overflow-hidden rounded-2xl border bg-slate-50/60 p-4 transition-all duration-300 ${
          sel !== -1 ? "border-blue-300 shadow-[0_0_0_3px_rgba(0,77,255,0.08)]" : "border-slate-200"
        }`}
      >
        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Segmento
        </p>
        <div className="mt-3 space-y-2">
          {options.map((o, i) => {
            const isSelected = sel === i;
            const isHovered = hovered === i;
            return (
              <div
                key={o}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ${
                  isSelected
                    ? "bg-white text-blue-600 shadow-sm scale-[1.03] ring-1 ring-blue-100"
                    : isHovered
                      ? "bg-slate-200/50 text-slate-700"
                      : "text-slate-500 opacity-60"
                }`}
              >
                <span className="font-medium">{o}</span>
                {isSelected && (
                  <div className="flex h-5 w-5 animate-scale-in items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  const [hovered, setHovered] = useState(-1);
  const [picked, setPicked] = useState(-1);

  useEffect(() => {
    if (!active) {
      setHovered(-1);
      setPicked(-1);
      return;
    }
    // Simula escolha do usuário
    const timers = [
      setTimeout(() => setHovered(1), 400),
      setTimeout(() => setHovered(2), 800),
      setTimeout(() => setHovered(0), 1200),
      setTimeout(() => {
        setHovered(-1);
        setPicked(0); // Seleciona WhatsApp
      }, 1600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      {channels.map((c, i) => {
        const isPicked = picked === i;
        const isHovered = hovered === i;
        return (
          <div
            key={c.label}
            className={`flex h-[110px] w-[94px] flex-col items-center justify-center gap-2 rounded-2xl border transition-all duration-500 ${
              isPicked
                ? "scale-105 border-blue-300 bg-white shadow-[0_0_0_4px_rgba(0,77,255,0.08)] ring-1 ring-blue-100"
                : isHovered
                  ? "border-slate-300 bg-slate-50 opacity-100 translate-y-[-4px]"
                  : "border-slate-200 bg-white opacity-50"
            }`}
          >
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${isPicked ? "bg-blue-50" : "bg-slate-50"}`}>
              <img src={c.img} alt={c.label} className="h-6 w-6 object-contain" />
              {isPicked && (
                <div className="absolute -right-1.5 -top-1.5 flex h-4 w-4 animate-scale-in items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                  <Check className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isPicked ? "text-blue-600" : "text-slate-400"}`}>
              {c.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StepTeste({ active }: { active: boolean }) {
  const bubbles = [
    { from: "ai", text: "Olá! Como posso ajudar?" },
    { from: "user", text: "Quero agendar uma consulta" },
    { from: "ai", text: "Com certeza! Qual o melhor horário?" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    const timers = bubbles.map((_, i) => setTimeout(() => setShown(i + 1), 600 + i * 1000));
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
    <div className="mt-8 flex flex-col items-center">
      {active && (
        <div className="relative flex flex-col items-center justify-center text-center">
          {/* Círculo de Sucesso */}
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-100 opacity-20" />
            <div className="relative flex h-20 w-20 animate-scale-in items-center justify-center rounded-full bg-emerald-50 shadow-[0_0_0_8px_rgba(16,185,129,0.05)]">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            {/* Sparkles ao redor */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Sparkles
                key={i}
                className="absolute h-4 w-4 text-amber-400 opacity-0"
                style={{
                  top: `${50 + 40 * Math.sin((i * 60 * Math.PI) / 180)}%`,
                  left: `${50 + 40 * Math.cos((i * 60 * Math.PI) / 180)}%`,
                  animation: `fade-in 0.5s forwards, float-soft ${2 + i * 0.5}s infinite`,
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>

          <h4 className="animate-fade-up text-2xl font-bold tracking-tight text-slate-900">
            Pronto para decolar!
          </h4>
          <p className="mt-2 animate-fade-up text-sm text-slate-500" style={{ animationDelay: "200ms" }}>
            Seu agente de IA foi configurado e está pronto para <br />
            transformar suas conversas em vendas.
          </p>

          <div 
            className="mt-8 flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-2 animate-fade-up"
            style={{ animationDelay: "400ms" }}
          >
            <Zap className="h-4 w-4 text-blue-500 fill-blue-500" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Acesso Liberado</span>
          </div>
        </div>
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
      <div className="relative rounded-[20px] border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]">
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
          <div className="flex h-10 w-10 float-soft items-center justify-center rounded-xl border border-emerald-100/50 bg-emerald-50 text-emerald-500 shadow-sm">
            <Zap className="h-5 w-5 fill-current" />
          </div>
        </div>
        <div className="absolute -right-10 top-1/3 hidden md:block">
          <div className="flex h-10 w-10 float-soft items-center justify-center rounded-xl border border-orange-100/50 bg-orange-50 text-orange-500 shadow-sm">
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
