import { useEffect, useRef, useState } from "react";
import { Users, BrainCircuit, MessageSquare, Bot, CheckCircle2, Zap, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const STEP_MS = 4500;

function useTypewriter(text: string, active: boolean, speed = 40) {
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
  const email = useTypewriter("joao@email.com", active, 35);
  const emailStarted = nome === "João Silva";

  return (
    <div className="mt-8 w-full max-w-xs space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-xl border border-slate-200 bg-slate-50/60 px-4 pt-4 pb-3 text-center"
      >
        <span className="text-[10px] text-slate-400">Nome</span>
        <p className="mt-0.5 text-base font-medium text-slate-900">
          {nome}
          <span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-emerald-500 align-middle" />
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-xl border border-slate-200 bg-slate-50/60 px-4 pt-4 pb-3 text-center"
      >
        <span className="text-[10px] text-slate-400">Email</span>
        <p className="mt-0.5 text-base font-medium text-slate-900">
          {emailStarted ? email : ""}
          {emailStarted && (
            <span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-emerald-500 align-middle" />
          )}
          {!emailStarted && <span className="text-slate-300">&nbsp;</span>}
        </p>
      </motion.div>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-8 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50/60 p-4"
    >
      <p className="text-center text-[10px] text-slate-400">Área</p>
      <div className="mt-2 space-y-1">
        {options.map((o, i) => (
          <motion.div
            key={o}
            animate={{
              backgroundColor: sel === i ? "#ffffff" : "transparent",
              boxShadow: sel === i ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
              scale: sel === i ? 1.02 : 1,
              color: sel === i ? "#0f172a" : "#64748b",
            }}
            className="rounded-lg py-2 text-center text-sm font-medium transition-colors"
          >
            {o}
          </motion.div>
        ))}
      </div>
    </motion.div>
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
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: picked && i !== 0 ? 0.4 : 1,
            y: 0,
            scale: picked && i === 0 ? 1.05 : 1,
            borderColor: picked && i === 0 ? "#6ee7b7" : "#e2e8f0",
            backgroundColor: picked && i === 0 ? "rgba(236, 252, 231, 0.7)" : "#ffffff",
          }}
          transition={{ delay: i * 0.1 }}
          className="flex h-[104px] w-[86px] flex-col items-center justify-center gap-2 rounded-2xl border transition-shadow"
          style={{
            boxShadow: picked && i === 0 ? "0 0 0 4px rgba(16,185,129,0.12)" : "none",
          }}
        >
          <img src={c.img} alt={c.label} className="h-7 w-7 object-contain" />
          <span className={`text-[11px] font-medium ${picked && i === 0 ? "text-emerald-600" : "text-slate-400"}`}>
            {c.label}
          </span>
        </motion.div>
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
    const timers = bubbles.map((_, i) => setTimeout(() => setShown(i + 1), 500 + i * 1200));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
    >
      <div className="space-y-3 min-h-[90px]">
        <AnimatePresence>
          {bubbles.slice(0, shown).map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex items-start gap-2 ${b.from === "user" ? "justify-end" : ""}`}
            >
              {b.from === "ai" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-[#A855F7]">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                  b.from === "ai"
                    ? "bg-[#F3E8FF] text-slate-700 rounded-tl-none shadow-sm"
                    : "bg-[#DCFCE7] text-slate-700 rounded-tr-none shadow-sm"
                }`}
              >
                {b.text}
              </div>
              {b.from === "user" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#10B981]">
                  <Users className="h-3.5 w-3.5" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StepPronto({ active }: { active: boolean }) {
  return (
    <div className="mt-6 flex flex-col items-center">
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-500 mb-4"
            >
              <CheckCircle2 className="h-10 w-10" />
            </motion.div>
            <p className="text-xl font-bold text-emerald-500">Agente criado com sucesso!</p>
            <div className="mt-2 flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -4, 0],
                    opacity: [0, 1, 0.5],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    delay: i * 0.2,
                  }}
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  }, [inView, step]);

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div ref={ref} className="mx-auto mt-20 max-w-[900px] px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-100 z-10">
          <motion.div
            key={step}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: STEP_MS / 1000, ease: "linear" }}
            className="h-full bg-emerald-500"
          />
        </div>

        {/* Window Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="font-mono text-[10px] font-medium tracking-tight text-slate-400">nextpro.ai / setup</div>
          <div className="w-10" />
        </div>

        {/* Conteúdo animado */}
        <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className="flex flex-col items-center"
            >
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${TONE[current.tone]}`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-2">{current.label}</h3>

              <div className="w-full flex flex-col items-center min-h-[160px] justify-center">
                {step === 0 && <StepCadastro active />}
                {step === 1 && <StepArea active />}
                {step === 2 && <StepCanal active />}
                {step === 3 && <StepTeste active />}
                {step === 4 && <StepPronto active />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Ícones flutuantes decorativos */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-6 top-1/2 hidden -translate-y-1/2 md:block"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100/50 bg-emerald-50/80 text-emerald-500 shadow-xl backdrop-blur-sm">
            <Zap className="h-6 w-6 fill-current" />
          </div>
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-6 top-1/3 hidden md:block"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100/50 bg-orange-50/80 text-orange-500 shadow-xl backdrop-blur-sm">
            <Sparkles className="h-6 w-6" />
          </div>
        </motion.div>
      </motion.div>

      {/* Stepper Control */}
      <div className="mt-8 flex items-center justify-center gap-3">
        {STEPS.map((s, i) => {
          const done = i < step;
          const isActive = i === step;
          const TabIcon = done ? Check : s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setStep(i)}
              className="group relative flex flex-col items-center gap-2"
              aria-label={s.label}
            >
              <motion.span
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isActive ? "#ecfdf5" : done ? "#f0fdf4" : "#ffffff",
                  borderColor: isActive ? "#10b981" : done ? "#86efac" : "#e2e8f0",
                  color: isActive ? "#059669" : done ? "#10b981" : "#94a3b8",
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 shadow-sm group-hover:shadow-md"
              >
                <TabIcon className="h-5 w-5" />
              </motion.span>
              <span
                className={`text-[10px] font-bold tracking-tight uppercase transition-colors ${
                  isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                }`}
              >
                {s.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="active-dot"
                  className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
