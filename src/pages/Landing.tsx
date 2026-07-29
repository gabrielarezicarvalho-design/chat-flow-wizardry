import { Link } from "react-router-dom";
import heroVideoAsset from "@/assets/hero.mp4.asset.json";
import logoAurora from "@/assets/logo-aurora.png.asset.json";
import avatarRafael from "@/assets/cases/rafael.png.asset.json";
import avatarIsabela from "@/assets/cases/isabela.png.asset.json";
import avatarDiego from "@/assets/cases/diego.png.asset.json";
import avatarLarissa from "@/assets/cases/larissa.png.asset.json";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Bot, CreditCard, Mic, Users, TrendingUp,
  Zap, Check, Star, ArrowRight, Search, MapPin, Sparkles,
  BellRing, ShieldCheck, PlayCircle, Building2, Store, Stethoscope, PhoneCall,
  GraduationCap, Scissors, Utensils, Plus, Smile, Send, Paperclip, Image as ImageIcon, X, Square,
  Filter, Target, Calendar, Play, Clock, Bell,
  Instagram, FileText, UsersRound, Headphones, Volume2, Repeat, Wallet, Receipt, AlertCircle, Megaphone, MessageSquare, ListChecks, Ban,
  Scale, Activity, Sun, Wrench, Twitter, Gift, Share2, HelpCircle, Shield, Cookie, Quote, ChevronRight, ChevronUp, CheckCircle2,
  Trophy, Globe, Mail
} from "lucide-react";

type LeadItem = { name: string; phone: string; origin: string };

const EMOJIS = ["😀","😂","😍","🥳","🚀","🔥","👍","🙏","💜","✨","✅","💡","📞","📎","🎉","💬","🤖","💰","📈","🎯"];

const stats = [
  { value: "+2.1M", label: "Mensagens enviadas" },
  { value: "+8.000", label: "Empresas conectadas" },
  { value: "+450k", label: "Leads captados" },
  { value: "24/7", label: "IA em operação" },
];

const segments = [
  { icon: Building2, label: "Imobiliária" },
  { icon: Stethoscope, label: "Dentista" },
  { icon: Scale, label: "Advogado" },
  { icon: Activity, label: "Clínica" },
  { icon: Scissors, label: "Estética" },
  { icon: Sun, label: "Energia Solar" },
  { icon: Store, label: "Loja" },
  { icon: Wrench, label: "Oficina" },
  { icon: Utensils, label: "Restaurante" },
];

const FEATURES = [
  {
    icon: Bot,
    title: "Aurora IA",
    description: "IA no WhatsApp 24/7, treinada no seu negócio. Transfere para humano quando precisar.",
    badge: "NOVO",
    href: "#ia",
  },
  {
    icon: Zap,
    title: "Automações de Fluxo",
    description: "Fluxos visuais drag-and-drop para vendas, pós-venda, aniversários e carrinho abandonado.",
    badge: null,
    href: "#recursos",
  },
  {
    icon: Headphones,
    title: "URA & Atendimento",
    description: "Distribua conversas entre IA e atendentes. Caixa compartilhada e métricas de atendimento.",
    badge: null,
    href: "#recursos",
  },
  {
    icon: Megaphone,
    title: "Disparo em Massa",
    description: "Campanhas no WhatsApp, e-mail e SMS com segmentação e relatórios em tempo real.",
    badge: null,
    href: "#recursos",
  },
  {
    icon: MapPin,
    title: "Google Maps Leads",
    description: "Extraia leads do Google Maps em segundos e envie para seus fluxos de vendas.",
    badge: null,
    href: "#recursos",
  },
  {
    icon: CreditCard,
    title: "Cobranças Recorrentes",
    description: "Automatize cobranças, boletos, Pix, lembretes e recupere inadimplentes.",
    badge: null,
    href: "#pagamentos",
  },
];

function FeaturesPopover({ label = "Funcionalidades" }: { label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group flex items-center gap-1 text-base text-slate-600 transition-colors hover:text-slate-900">
          {label}

          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70 transition-transform group-data-[state=open]:rotate-180">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={12}
        className="w-[900px] max-w-[95vw] overflow-hidden border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl shadow-slate-900/10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Grid de funcionalidades */}
          <div className="grid grid-cols-2 gap-3 p-5">
            {FEATURES.map((feature) => (
              <a
                key={feature.title}
                href={feature.href}
                className="group flex flex-col gap-2 rounded-xl bg-slate-50 p-3 transition-all hover:bg-white hover:ring-1 hover:ring-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#004DFF] ring-1 ring-slate-200 transition-colors group-hover:bg-slate-50 group-hover:ring-[#004DFF]/30">
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">{feature.title}</span>
                      {feature.badge && (
                        <span className="rounded-full bg-[#004DFF]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#004DFF]">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] leading-snug text-slate-500">{feature.description}</p>
              </a>
            ))}
          </div>

          {/* Destaque lateral */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#f0f4ff] to-white p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,77,255,0.08),transparent_60%)]" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#004DFF]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#004DFF]">NOVIDADE</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">Voz clonada com IA chegou.</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Gere áudios com a sua voz clonada pelo ElevenLabs e envie respostas de áudio para seus clientes no WhatsApp automaticamente.
              </p>
            </div>
            <a href="#ia" className="relative z-10 mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#004DFF] transition-opacity hover:opacity-80">
              Ver como funciona <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const cases = [
  {
    name: "Rafael Monteiro",
    role: "Diretor Comercial @ Kite Imóveis",
    plan: "PLANO BUSINESS",
    avatar: avatarRafael.url,
    before: [
      { label: "Tempo de resposta ao lead", value: "3h em média" },
      { label: "Atendentes necessários", value: "6 pessoas" },
      { label: "Leads perdidos/mês", value: "480" },
    ],
    after: [
      { label: "Tempo de resposta ao lead", value: "8 segundos" },
      { label: "Atendentes necessários", value: "2 pessoas" },
      { label: "Leads perdidos/mês", value: "35" },
    ],
    result: "-92% de leads perdidos",
    quote: "A IA da Next Pro atende 24/7 e só me passa o lead quando está pronto pra fechar. Reduzi a equipe pela metade e vendo mais.",
  },
  {
    name: "Isabela Rocha",
    role: "CEO @ Nova Estética",
    plan: "PLANO START",
    avatar: avatarIsabela.url,
    before: [
      { label: "Agendamentos/mês", value: "62" },
      { label: "Faturamento mensal", value: "R$ 18.400" },
      { label: "No-show", value: "31%" },
    ],
    after: [
      { label: "Agendamentos/mês", value: "214" },
      { label: "Faturamento mensal", value: "R$ 71.200" },
      { label: "No-show", value: "9%" },
    ],
    result: "3.8x no faturamento",
    quote: "Coloquei o WhatsApp no automático com os fluxos da Next Pro. Meu salão triplicou de agenda em 60 dias — sem contratar ninguém.",
  },
  {
    name: "Diego Almeida",
    role: "Fundador @ Loja Alma",
    plan: "PLANO START",
    avatar: avatarDiego.url,
    before: [
      { label: "Recuperação de carrinho", value: "R$ 0" },
      { label: "Ticket médio", value: "R$ 89" },
      { label: "Cobranças no atraso", value: "58%" },
    ],
    after: [
      { label: "Recuperação de carrinho", value: "R$ 24.700/mês" },
      { label: "Ticket médio", value: "R$ 147" },
      { label: "Cobranças no atraso", value: "11%" },
    ],
    result: "+R$ 24.7k recuperados/mês",
    quote: "A recuperação financeira e o disparo em massa se pagaram na primeira semana. Hoje o CRM roda minha loja sozinho.",
  },
  {
    name: "Larissa Pinto",
    role: "Head de Growth @ Fluxo Digital",
    plan: "PLANO BUSINESS",
    avatar: avatarLarissa.url,
    before: [
      { label: "Leads qualificados/mês", value: "180" },
      { label: "Conversão em vendas", value: "1.9%" },
      { label: "Custo por venda", value: "R$ 340" },
    ],
    after: [
      { label: "Leads qualificados/mês", value: "1.240" },
      { label: "Conversão em vendas", value: "5.4%" },
      { label: "Custo por venda", value: "R$ 78" },
    ],
    result: "+184% em conversão",
    quote: "Integrei os coletores de Instagram e TikTok com a URA + IA. Meu funil ficou 3x mais barato e a conversão explodiu.",
  },
];

declare global {
  interface Window {
    initLandingMap?: () => void;
  }
}

const PHRASES = [
  { prefix: "e sua", suffix: "base cresce" },
  { prefix: "e sua", suffix: "recompra dispara" },
  { prefix: "e seu", suffix: "faturamento decola" },
  { prefix: "e suas", suffix: "vendas crescem" },
];

function TypewriterText() {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const phrase = PHRASES[index];
  const full = `${phrase.prefix} ${phrase.suffix}`;

  useEffect(() => {
    const typeSpeed = 80;
    const deleteSpeed = 40;
    const pauseAfterType = 2000;

    let timer: ReturnType<typeof setTimeout>;

    if (isDeleting) {
      if (count > 0) {
        timer = setTimeout(() => setCount((c) => c - 1), deleteSpeed);
      } else {
        setIndex((i) => (i + 1) % PHRASES.length);
        setIsDeleting(false);
      }
    } else {
      if (count < full.length) {
        timer = setTimeout(() => setCount((c) => c + 1), typeSpeed);
      } else {
        timer = setTimeout(() => setIsDeleting(true), pauseAfterType);
      }
    }

    return () => clearTimeout(timer);
  }, [index, count, isDeleting, full.length]);

  const typed = full.slice(0, count);
  const prefixTyped = typed.slice(0, phrase.prefix.length);
  const suffixTyped = typed.length > phrase.prefix.length + 1 ? typed.slice(phrase.prefix.length + 1) : "";
  const onSuffix = typed.length > phrase.prefix.length;

  const cursor = (
    <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[#4d8bff] align-middle" />
  );

  return (
    <>
      <span className="block">
        <span className="text-white">voltam</span>{" "}
        <span className="whitespace-nowrap text-[#4d8bff]">{prefixTyped}</span>
        {!onSuffix && cursor}
      </span>
      <span className="block whitespace-nowrap text-[#4d8bff]">
        {suffixTyped}
        {onSuffix && cursor}
      </span>
    </>
  );
}
const METRIC_VARIANTS = [
  ["4.8★ de satisfação", "+36% recompra", "R$ 82k recuperados", "1.240 clientes voltaram"],
  ["4.9★ de satisfação", "+52% recompra", "R$ 120k recuperados", "2.300 clientes voltaram"],
  ["3x mais produtivo", "-40% de no-shows", "+18% de conversão", "R$ 1M+ em vendas"],
  ["98% de leitura", "+65% de retenção", "R$ 250k recuperados", "5.000 clientes ativos"],
];

function RotatingMetrics() {
  const [variantIndex, setVariantIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setVariantIndex((i) => (i + 1) % METRIC_VARIANTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const metrics = METRIC_VARIANTS[variantIndex];
  const positions = [
    { className: "right-0 top-[22%]", delay: "0.4s" },
    { className: "-right-4 top-[47%]", delay: "1.1s" },
    { className: "-left-2 top-[62%]", delay: "1.8s" },
    { className: "-left-4 bottom-[12%]", delay: "0s" },
  ];

  return (
    <>
      {metrics.map((text, i) => (
        <div
          key={i}
          className={`pill-float absolute ${positions[i].className} rounded-lg border border-slate-200/60 bg-white/95 px-4 py-2 text-xs font-medium text-slate-900 shadow-xl whitespace-nowrap backdrop-blur-sm`}
          style={{ animationDelay: positions[i].delay }}
        >
          <span className="pill-dot mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#004DFF]" />
          <span key={`${i}-${variantIndex}`} className="animate-fade-in">
            {text}
          </span>
        </div>
      ))}
    </>
  );
}

const BRAND_SETS = [
  ["Vizze", "VivaMais", "Med Prime", "Arami"],
  ["Belleza", "Oficina 7", "SolarTech", "Nutrir"],
  ["ConstruPro", "PetVet", "Pizzaria Fogo", "Elegance"],
  ["Conecta", "MoveUp", "ClinicaMais", "Casa Forte"],
  ["FitPro", "AgroBem", "TechMais", "Maré Alta"],
];

function RotatingBrands() {
  const [setIndex, setSetIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSetIndex((i) => (i + 1) % BRAND_SETS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {BRAND_SETS[setIndex].map((b) => (
        <span
          key={`${setIndex}-${b}`}
          className="brand-fade-in font-space-grotesk text-xl font-bold tracking-wide text-slate-400"
        >
          {b}
        </span>
      ))}
    </>
  );
}

const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    "1 atendente",
    "1 conexão WhatsApp",
    "IA completa (limitada)",
    "Chat interno",
    "CRM com funil de vendas",
    "Automação de fluxos (limitada)",
    "20 disparos no total",
    "Agendamentos",
    "Prospecção Google Maps (limitada)",
    "Cobranças recorrentes",
    "Relatórios essenciais",
    "Suporte por WhatsApp",
  ],
  start: [
    "5 atendentes",
    "2 conexões WhatsApp",
    "IA completa",
    "Chat interno",
    "CRM com funil de vendas",
    "Automação de fluxos",
    "Disparos em massa",
    "Agendamentos",
    "Prospecção Google Maps",
    "Cobranças recorrentes",
    "Relatórios essenciais",
    "Suporte por WhatsApp",
  ],
  business: [
    "20 atendentes",
    "Clientes ilimitados",
    "Prospecção completa",
    "Suporte prioritário",
    "Conexões WhatsApp ilimitadas",
    "Agentes de IA avançados",
    "Voz clonada com IA",
    "Leads Instagram e TikTok",
    "Espionagem de anúncios",
    "Recuperação financeira",
    "API e webhooks",
    "Relatórios avançados",
  ],
};

function RotatingChips({ tier }: { tier: string }) {
  const features = PLAN_FEATURES[tier] ?? [];
  if (features.length === 0) return null;

  const loop = [...features, ...features];

  return (
    <div className="chip-marquee w-full overflow-hidden">
      <div
        className="chip-marquee-track flex w-max items-center gap-5"
        style={{ animationDuration: `${features.length * 3.5}s` }}
      >
        {loop.map((c, i) => (
          <span
            key={`${i}-${c}`}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-slate-600"
          >
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}






export default function Landing() {

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [showCompareTable, setShowCompareTable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("dentistas em São Paulo");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [userMessages, setUserMessages] = useState<Array<{ id: string; kind: "text" | "audio" | "file"; content: string; fileName?: string; previewUrl?: string; duration?: number; audioUrl?: string }>>([]);
  const [interacted, setInteracted] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [savedLeads, setSavedLeads] = useState<string[]>([]);
  const [subscribing, setSubscribing] = useState<"start" | "business" | null>(null);

  const handleSubscribe = async (tier: "start" | "business") => {
    try {
      setSubscribing(tier);
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        window.location.href = `/auth?redirect=${encodeURIComponent(`/?subscribe=${tier}&billing=${billing}`)}`;
        return;
      }
      const { data, error } = await supabase.functions.invoke("platform-subscription-create", {
        body: { tier, billing, backUrl: `${window.location.origin}/home?subscription=success` },
      });
      if (error) throw error;
      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("Sem link de checkout");
      }
    } catch (e) {
      console.error(e);
      alert(`Erro ao iniciar assinatura: ${e instanceof Error ? e.message : String(e)}`);
      setSubscribing(null);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const chatMessages = [
    { id: 1, sender: "client", content: "Vi sua mensagem, do que se trata?", delay: 0 },
    { id: 2, sender: "ai", content: "Oi! Achei sua clínica no Google Maps e queria te apresentar uma IA que prospecta e atende no WhatsApp por você 🚀", delay: 1400, typingDelay: 400 },
    { id: 3, sender: "client", content: "Interessante, como funciona?", delay: 3200 },
    { id: 4, sender: "ai", content: "Posso te mostrar em 5 min numa demo? Amanhã 14h tá bom?", delay: 4600, typingDelay: 500 },
    { id: 5, sender: "status", content: "✦ respondeu em 2s", delay: 6400 },
  ];

  useEffect(() => {
    if (interacted) return;
    let timers: number[] = [];

    const clearTimers = () => {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    };

    const reset = () => {
      clearTimers();
      setVisibleCount(0);
      setShowTyping(false);
      runSequence();
    };

    const runSequence = () => {
      chatMessages.forEach((msg) => {
        if (msg.typingDelay !== undefined) {
          timers.push(window.setTimeout(() => setShowTyping(true), msg.delay - msg.typingDelay));
        }
        timers.push(window.setTimeout(() => {
          setShowTyping(false);
          setVisibleCount((c) => c + 1);
        }, msg.delay));
      });
      timers.push(window.setTimeout(reset, 9000));
    };

    runSequence();
    return () => clearTimers();
  }, [interacted]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, userMessages, showTyping]);

  useEffect(() => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key || !mapRef.current) return;

    const initMap = () => {
      const mapDiv = mapRef.current;
      if (!mapDiv) return;
      const g = (window as any).google;
      const map = new g.maps.Map(mapDiv, {
        center: { lat: -23.55052, lng: -46.633308 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        draggable: true,
        scrollwheel: true,
        gestureHandling: "greedy",
        disableDoubleClickZoom: false,
        zoomControl: true,
      });
      mapInstanceRef.current = map;
      const places = [
        { lat: -23.548, lng: -46.636, title: "Padaria do João" },
        { lat: -23.553, lng: -46.628, title: "Clínica Bem Estar" },
        { lat: -23.545, lng: -46.642, title: "Studio de Beleza" },
        { lat: -23.558, lng: -46.62, title: "Auto Escola Rápida" },
        { lat: -23.552, lng: -46.638, title: "Restaurante Sabor" },
      ];
      places.forEach((p) => new g.maps.Marker({ position: p, map, title: p.title }));
      setMapLoaded(true);
    };

    if ((window as any).google?.maps) {
      initMap();
      return;
    }

    (window as any).initLandingMap = initMap;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initLandingMap&channel=${channel}`;
    script.async = true;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  const stopDemo = () => {
    if (!interacted) {
      setInteracted(true);
      setVisibleCount(chatMessages.length);
      setShowTyping(false);
    }
  };

  const simulateAIReply = (text: string) => {
    setShowTyping(true);
    window.setTimeout(() => {
      setShowTyping(false);
      setUserMessages((prev) => [...prev, { id: `ai-${Date.now()}`, kind: "text", content: text }]);
    }, 1200);
  };

  const callAurora = async (payload: { message?: string; audio?: string; audioMime?: string }): Promise<{ text: string; audio?: string | null; transcript?: string | null } | null> => {
    const hasMessage = !!payload.message && payload.message.trim().length > 0;
    const hasAudio = !!payload.audio && payload.audio.length > 0;
    if (!hasMessage && !hasAudio) return null;
    try {
      const { data, error } = await supabase.functions.invoke("landing-aurora-chat", {
        body: { ...payload, history: conversationRef.current.slice(-10) },
      });
      if (error) throw error;
      return data as any;
    } catch (e) {
      console.error("Aurora error:", e);
      return null;
    }
  };

  const sendText = async () => {
    const v = inputValue.trim();
    if (!v) return;
    stopDemo();
    setUserMessages((prev) => [...prev, { id: `u-${Date.now()}`, kind: "text", content: v }]);
    conversationRef.current.push({ role: "user", content: v });
    setInputValue("");
    setShowEmoji(false);
    setShowTyping(true);
    const res = await callAurora({ message: v });
    setShowTyping(false);
    const replyText = res?.text || "Desculpe, tive um problema pra responder agora 🙈";
    conversationRef.current.push({ role: "assistant", content: replyText });
    setUserMessages((prev) => [...prev, { id: `ai-${Date.now()}`, kind: "text", content: replyText }]);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopDemo();
    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    setUserMessages((prev) => [...prev, {
      id: `f-${Date.now()}`,
      kind: "file",
      content: isImage ? "image" : "file",
      fileName: file.name,
      previewUrl,
    }]);
    e.target.value = "";
    simulateAIReply(isImage ? "Recebi sua imagem! 📎 Já anotei aqui." : "Arquivo recebido, obrigado! 📎");
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const getAudioDuration = async (blob: Blob): Promise<number> => {
    try {
      const audioContext = new AudioContext();
      const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
      const duration = decoded.duration;
      await audioContext.close();
      if (Number.isFinite(duration) && duration > 0) return duration;
    } catch (error) {
      console.warn("Não foi possível decodificar a duração do áudio:", error);
    }

    // ElevenLabs retorna MP3 a 128 kbps; o tamanho fornece uma duração confiável
    // quando o navegador não disponibiliza os metadados do arquivo.
    return Math.max(1, (blob.size * 8) / 128_000);
  };

  const startRecording = async () => {
    stopDemo();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunksRef.current.length === 0) return;
        const duration = recordSeconds || 1;
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const audioUrl = URL.createObjectURL(blob);
        setUserMessages((prev) => [...prev, { id: `a-${Date.now()}`, kind: "audio", content: "audio", duration, audioUrl }]);
        setShowTyping(true);
        const base64 = await blobToBase64(blob);
        const res = await callAurora({ audio: base64, audioMime: mime });
        setShowTyping(false);
        if (res?.transcript) conversationRef.current.push({ role: "user", content: res.transcript });
        const replyText = res?.text || "Não consegui escutar direito, pode repetir? 🙏";
        conversationRef.current.push({ role: "assistant", content: replyText });
        if (res?.audio) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(res.audio), (c) => c.charCodeAt(0))],
            { type: "audio/mpeg" },
          );
          const replyUrl = URL.createObjectURL(audioBlob);
          const replyAudio = new Audio(replyUrl);
          const msgId = `ai-a-${Date.now()}`;
          const duration = await getAudioDuration(audioBlob);
          setUserMessages((prev) => [...prev, {
            id: msgId,
            kind: "audio",
            content: replyText,
            duration: Math.max(1, Math.ceil(duration)),
            audioUrl: replyUrl,
          }]);
          replyAudio.play().catch(() => {});
        } else {
          setUserMessages((prev) => [...prev, { id: `ai-${Date.now()}`, kind: "text", content: replyText }]);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error("Mic error:", e);
      alert("Não consegui acessar o microfone. Autoriza o acesso no navegador 🎙️");
    }
  };

  const stopRecording = (send = true) => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    setIsRecording(false);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      if (!send) recorder.ondataavailable = null as any;
      recorder.stop();
    }
    if (!send) {
      setRecordSeconds(0);
      audioChunksRef.current = [];
    }
  };

  const toggleRecording = () => {
    if (!isRecording) startRecording();
    else stopRecording(true);
  };

  const insertEmoji = (emoji: string) => {
    setInputValue((v) => v + emoji);
  };


  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HERO com nav flutuante sobre a foto */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Fundo com vídeo */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover object-center"
            poster=""
          >
            <source src={heroVideoAsset.url} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/20" />
        </div>

        {/* NAV flutuante */}
        <header className="relative z-40 px-4 pt-4">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-2xl border border-white/40 bg-white/80 px-6 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2 whitespace-nowrap font-bold text-xl font-space-grotesk text-slate-900">
                <img src={logoAurora.url} alt="NEXT PRO" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                <span>NEXT <span className="text-[#004DFF]">PRO</span></span>
                <span className="rounded-md bg-[#004DFF]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#004DFF]">Beta</span>
              </div>

              <nav className="hidden lg:flex items-center gap-8 text-[15px] text-slate-600">
                <FeaturesPopover label="Inteligência" />
                <a href="#depoimentos" className="hover:text-slate-900">Como Funciona</a>
                <a href="#planos" className="hover:text-slate-900">Preços</a>
                <a href="#pagamentos" className="hover:text-slate-900">Blog</a>
              </nav>

            </div>
            <div className="hidden md:flex items-center gap-4">
              <span className="hidden lg:flex items-center gap-1.5 text-sm text-slate-500">
                <Globe className="h-4 w-4" /> PT
              </span>
              <Sun className="hidden lg:block h-4 w-4 text-slate-500" />
              <Link to="/auth" className="text-[15px] font-medium text-slate-700 hover:text-slate-900">
                Entrar
              </Link>
              <Link to="/auth">
                <Button className="btn-shine btn-press rounded-full bg-[#004DFF] px-6 text-white hover:bg-[#0040d6]">
                  Começar grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-1 items-end">
          <div className="mx-auto grid w-full max-w-[1400px] items-end gap-12 pl-4 pr-2 py-12 lg:grid-cols-2 lg:pr-0">
          <div>
            <div className="hero-reveal inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              <Trophy className="h-4 w-4 text-amber-300" />
              CRM nº 1 com IA para vender no WhatsApp
            </div>

            <h1 className="hero-reveal hero-d1 mt-6 font-space-grotesk text-[clamp(2.2rem,5.2vw,3.6rem)] font-bold leading-[1.05] tracking-tight text-white">
              <span className="block lg:whitespace-nowrap">Sua IA vende, atende</span>
              <span className="block lg:whitespace-nowrap">
                e <span className="text-[#22c55e]">organiza seus</span>
              </span>
              <span className="block lg:whitespace-nowrap">
                <span className="text-[#22c55e]">clientes</span> no automático.
              </span>
            </h1>

            <p className="hero-reveal hero-d2 mt-6 max-w-xl text-xl leading-relaxed text-white/80">
              <span className="block lg:whitespace-nowrap">Enquanto você trabalha, ela responde cada cliente em</span>
              <span className="block lg:whitespace-nowrap">segundos, fecha a venda e organiza tudo no CRM. 7 dias</span>
              <span className="block lg:whitespace-nowrap">grátis, sem cartão.</span>
            </p>

            <div className="hero-reveal hero-d3 mt-8 flex items-baseline gap-2 text-white">
              <span className="text-sm text-white/70">a partir de</span>
              <span className="font-space-grotesk text-5xl font-bold">R$ 29,90</span>
              <span className="text-white/70">/mês</span>
            </div>

            <div className="hero-reveal hero-d4 mt-8 flex flex-wrap items-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="btn-shine btn-press h-14 rounded-full bg-[#004DFF] px-8 text-lg font-semibold text-white hover:bg-[#0040d6]">
                  Testar 7 dias grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

              </Link>
              <a href="https://wa.me/message/BYSDMLHYTA6EA1" target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline" className="h-14 rounded-full border-white/40 bg-white/10 px-8 text-lg font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white">
                  <Mail className="mr-2 h-4 w-4" /> Fale com a gente
                </Button>
              </a>
            </div>

            <div className="hero-reveal hero-d5 mt-6 flex flex-wrap items-center gap-6 text-sm text-white/80">
              {["Sem cartão", "5 min pra configurar", "Cancele quando quiser"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#4d8bff]" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Card de chat */}
          <div className="hero-reveal-right hero-d3 w-full max-w-[460px] self-end ml-auto">
            <div className="flex h-[clamp(440px,56vh,520px)] flex-col rounded-[32px] bg-[#E8E5E2] p-5 shadow-2xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#7FE3A3] via-[#4CD080] to-[#2FB86A] shadow-md shadow-[#4CD080]/30" />
                  <div>
                    <p className="font-semibold text-slate-900">Seu colaborador de IA</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online agora
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Teste você mesmo</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {["Clínica", "Imobiliária", "Loja", "Serviços"].map((c, i) => (
                  <span
                    key={c}
                    className={`rounded-full border px-3 py-1 text-sm ${i === 0 ? "border-[#7FE3A3]/40 bg-[#7FE3A3]/15 text-[#2A8C5A]" : "border-slate-300/60 bg-white/60 text-slate-600"}`}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex-1">
                <div className="inline-block max-w-[85%] rounded-2xl rounded-tl-sm bg-[#A8C8B5]/55 px-4 py-3 text-slate-800">
                  Oi! 😄 Como posso ajudar você hoje?
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {["Tem horário amanhã à tarde?", "Vocês atendem convênio?"].map((q) => (
                  <span key={q} className="rounded-full border border-slate-300/60 bg-white/70 px-3 py-1.5 text-sm text-slate-600">
                    {q}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm text-slate-500">
                <Check className="h-4 w-4" /> Toque numa pergunta e veja a venda acontecer
              </div>
            </div>
          </div>

          </div>
        </div>
      </section>


      {/* DEMO AURORA */}
      <section className="bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Prospecção · Atendimento · Cobrança
            </div>
            <h2 className="mt-5 text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Encontra clientes.
              <br />
              <span className="text-[#004DFF]">Vende sozinho.</span>
              <br />
              No seu WhatsApp.
            </h2>
            <p className="mt-6 max-w-xl text-xl text-slate-600 md:mx-0 mx-auto">
              Converse agora com a Aurora AI e veja como ela atende, qualifica e vende
              pelo WhatsApp — 24 horas por dia.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-lg md:mx-0 mx-auto">
              {stats.slice(0, 3).map((s) => (
                <div key={s.label} className="text-center md:text-left">
                  <div className="text-3xl md:text-4xl font-bold text-[#004DFF]">
                    {s.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 to-primary/10 blur-3xl opacity-60 rounded-full" />
            <div className="relative rounded-3xl bg-white shadow-2xl p-6 text-left">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900">Aurora AI</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <span>digitando</span>
                      <span className="inline-flex items-center gap-0.5">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                </div>
                <PhoneCall className="h-4 w-4 text-slate-400" />
              </div>

              <div ref={scrollRef} className="mt-6 h-[260px] space-y-3 overflow-y-auto flex flex-col">
                <div className="mt-auto space-y-3">
                {chatMessages.slice(0, visibleCount).map((msg, idx) => {
                  if (msg.sender === "status") {
                    return (
                      <div
                        key={msg.id}
                        className="text-[11px] text-primary flex items-center gap-1 animate-fade-in"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {msg.content}
                      </div>
                    );
                  }
                  if (msg.sender === "client") {
                    return (
                      <div
                        key={msg.id}
                        className="max-w-[75%] rounded-2xl bg-slate-100 px-4 py-2 text-base text-slate-700 animate-fade-in"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {msg.content}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className="ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-base text-white shadow-md animate-fade-in"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="text-[11px] font-semibold opacity-90 mb-1">✦ Aurora AI</div>
                      {msg.content}
                    </div>
                  );
                })}

                {userMessages.map((m) => {
                  const isAI = m.id.startsWith("ai-");
                  if (m.kind === "text") {
                    return isAI ? (
                      <div key={m.id} className="ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-base text-white shadow-md animate-fade-in">
                        <div className="text-[11px] font-semibold opacity-90 mb-1">✦ Aurora AI</div>
                        {m.content}
                      </div>
                    ) : (
                      <div key={m.id} className="max-w-[75%] rounded-2xl bg-slate-100 px-4 py-2 text-base text-slate-700 animate-fade-in">
                        {m.content}
                      </div>
                    );
                  }
                  if (m.kind === "file") {
                    return (
                      <div key={m.id} className="max-w-[75%] rounded-2xl bg-slate-100 p-2 text-base text-slate-700 animate-fade-in">
                        {m.previewUrl ? (
                          <img src={m.previewUrl} alt={m.fileName} className="rounded-lg max-h-32 object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-1">
                            <Paperclip className="h-4 w-4 text-slate-500" />
                            <span className="truncate max-w-[160px]">{m.fileName}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  // audio
                  const dur = Math.max(1, Math.round(m.duration ?? 1));
                  const durationLabel = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}`;
                  return (
                    <div key={m.id} className={`${isAI ? "ml-auto bg-primary text-white" : "bg-slate-100 text-slate-700"} max-w-[75%] rounded-2xl px-3 py-2 text-base flex items-center gap-2 animate-fade-in`}>
                      <button
                        type="button"
                        onClick={() => { if (m.audioUrl) new Audio(m.audioUrl).play().catch(() => {}); }}
                        className={`h-7 w-7 flex items-center justify-center rounded-full ${isAI ? "bg-white text-primary" : "bg-primary text-white"}`}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </button>
                      <div className="flex items-end gap-0.5 h-5">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <span key={i} className={`w-0.5 rounded-full ${isAI ? "bg-white/70" : "bg-primary/60"}`} style={{ height: `${20 + (i * 37) % 80}%` }} />
                        ))}
                      </div>
                      <span className={`text-[11px] ${isAI ? "text-white/80" : "text-slate-500"}`}>{durationLabel}</span>
                    </div>
                  );
                })}

                {showTyping && (
                  <div className="max-w-[55%] rounded-2xl bg-slate-100 px-4 py-3 text-base text-slate-700 animate-fade-in">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                </div>
              </div>

              {showEmoji && (
                <div className="mt-3 grid grid-cols-10 gap-1 rounded-2xl bg-slate-50 border border-slate-200 p-2 animate-fade-in">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-200 text-lg"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              {isRecording ? (
                <div className="mt-6 flex items-center gap-3 rounded-full bg-red-50 px-3 py-2 text-red-600 border border-red-200">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="flex-1 text-base font-medium">Gravando… 0:{String(recordSeconds).padStart(2, "0")}</span>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-100"
                    aria-label="Cancelar gravação"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                    aria-label="Parar e enviar"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-500">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,audio/*,video/*"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
                    aria-label="Anexar arquivo"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 ${showEmoji ? "text-primary" : ""}`}
                    aria-label="Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
                    onFocus={stopDemo}
                    placeholder="Digite uma mensagem"
                    className="flex-1 bg-transparent text-base text-slate-700 placeholder:text-slate-400 outline-none min-w-0"
                  />
                  {inputValue.trim() ? (
                    <button
                      type="button"
                      onClick={sendText}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark"
                      aria-label="Enviar"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
                      aria-label="Gravar áudio"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Cities strip */}
        <div className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-5 flex flex-wrap items-center justify-center gap-x-12 gap-y-2">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Usado por times no</span>
            {["Rio de Janeiro", "São Paulo", "Distrito Federal", "Mato Grosso", "Santa Catarina", "Rio Grande do Sul"].map((c) => (
              <span key={c} className="text-base text-slate-600">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROSPECÇÃO */}
      <section id="recursos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Prospecção automática</span>
          <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
            Encontre clientes{" "}
            <span className="text-[#004DFF]">automaticamente.</span>
          </h2>
          <p className="mt-5 text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Pesquisa no Google Maps, extrai contatos e dispara o primeiro "oi" no WhatsApp.
            O sistema acha clientes enquanto você dorme.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          {/* Card do mapa estilo macOS */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="flex gap-1.5 group">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57] animate-pulse shadow-[0_0_6px_#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e] animate-pulse delay-75 shadow-[0_0_6px_#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840] animate-pulse delay-150 shadow-[0_0_6px_#28c840]" />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const g = (window as any).google;
                  if (g?.maps && mapInstanceRef.current && searchQuery.trim()) {
                    new g.maps.Geocoder().geocode({ address: searchQuery }, (results: any, status: string) => {
                      if (status === "OK" && results?.[0]) {
                        mapInstanceRef.current.setCenter(results[0].geometry.location);
                        mapInstanceRef.current.setZoom(13);
                      }
                    });
                  }
                }}
                className="flex-1 flex items-center gap-2 rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-500 cursor-text hover:border-slate-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar no Google Maps..."
                  className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
              </form>
            </div>
            <div className="p-3 grid grid-cols-[1fr_180px] gap-3">
              <div className="relative h-80 bg-slate-100 rounded-xl overflow-hidden">
                <div ref={mapRef} className="absolute inset-0" />
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {([
                  { name: "Clínica Sorriso+", phone: "(11) 9 9876-***", origin: "Google Maps" },
                  { name: "OdontoCenter Jardins", phone: "(11) 9 4421-***", origin: "Google Maps" },
                  { name: "Dr. Renato Dental", phone: "(11) 9 7766-***", origin: "Google Maps" },
                  { name: "Odonto Vila Mariana", phone: "(11) 9 3312-***", origin: "Google Maps" },
                  { name: "Sorriso Perfeito SP", phone: "(11) 9 8821-***", origin: "Google Maps" },
                  { name: "Implantes Paulista", phone: "(11) 9 5540-***", origin: "Google Maps" },
                ] as LeadItem[]).map((lead) => (
                  <button
                    type="button"
                    key={lead.name}
                    onClick={() => setSelectedLead(lead)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-primary/40 hover:shadow-sm transition"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-900 truncate leading-tight">{lead.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{lead.phone}</div>
                    </div>
                    <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">novo</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fluxo automatizado */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-5">
              Fluxo automatizado
            </div>
            <div className="space-y-3">
              {[
                { icon: Search, title: "Buscar no Maps", desc: "Nicho + cidade" },
                { icon: Filter, title: "Limpar lista", desc: "Remove duplicados/inválidos" },
                { icon: Send, title: "Primeira mensagem", desc: "Ritmo humano no WhatsApp" },
                { icon: Bot, title: "IA conduz a conversa", desc: "Responde, qualifica, agenda" },
              ].map((step) => (
                <div key={step.title} className="flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-slate-50 transition">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-base">{step.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{step.desc}</div>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quatro cards de recursos */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MapPin, title: "Google Maps", desc: "Extração por nicho + cidade" },
            { icon: Filter, title: "Filtros inteligentes", desc: "Tira duplicados e inválidos" },
            { icon: Send, title: "Disparo no WhatsApp", desc: "Ritmo humano, anti-bloqueio" },
            { icon: Bot, title: "IA assume a conversa", desc: "Responde, agenda, recupera" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-primary/40 hover:shadow-sm transition">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold text-slate-900 text-base">{f.title}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>


      {/* IA */}
      <section id="ia" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Tudo que você precisa</span>
            <h2 className="mt-3 text-4xl md:text-6xl font-bold text-slate-900">
              Uma IA que{" "}
              <span className="text-[#004DFF]">
                vende sozinha
              </span>
              .
            </h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
              Do primeiro "oi" até o fechamento. Tudo automático, tudo natural.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {/* Chat bento — 2 cols wide, 2 rows tall */}
            <div className="md:col-span-2 md:row-span-2 rounded-2xl bg-white p-6 border border-slate-200">
              <MessageCircle className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Atende como um humano</div>
              <div className="text-base text-slate-500 mt-1">
                Responde texto e áudio, entende contexto, lembra do cliente. Conversa de verdade.
              </div>

              <div className="mt-8 space-y-3">
                <div className="max-w-[70%] rounded-2xl bg-slate-100 px-4 py-2.5 text-base text-slate-800">
                  Oi, vi o anúncio. Tem disponível?
                </div>
                <div className="ml-auto max-w-[75%] rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-4 py-2.5 text-base text-white">
                  <div className="text-[10px] font-semibold opacity-80 mb-0.5">✦ IA Next Pro</div>
                  Tenho sim! Pra quando você precisa? Posso já reservar 😊
                </div>
                <div className="max-w-[70%] rounded-2xl bg-slate-100 px-4 py-2.5 text-base text-slate-800">
                  Pode ser amanhã 14h?
                </div>
                <div className="ml-auto max-w-[75%] rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-4 py-2.5 text-base text-white">
                  <div className="text-[10px] font-semibold opacity-80 mb-0.5">✦ IA Next Pro</div>
                  Agendado! Te mando um lembrete 1h antes ✅
                </div>
              </div>
            </div>

            {/* Transcreve áudio */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <Mic className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Transcreve áudio</div>
              <div className="text-base text-slate-500 mt-1">
                Cliente mandou áudio? A IA escuta, entende e responde na hora.
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white">
                  <Play className="h-4 w-4 ml-0.5" />
                </div>
                <div className="flex-1 flex gap-0.5 h-6 items-center">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full bg-primary/70"
                      style={{ height: `${25 + Math.abs(Math.sin(i * 0.9)) * 75}%` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400">0:12</span>
              </div>
            </div>

            {/* Recupera leads frios */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <Clock className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Recupera leads frios</div>
              <div className="text-base text-slate-500 mt-1">
                Follow-up automático até o cliente responder.
              </div>
            </div>

            {/* Agenda automático */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <Calendar className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Agenda automático</div>
              <div className="text-base text-slate-500 mt-1">
                Marca reuniões e visitas sem você abrir a agenda.
              </div>
            </div>

            {/* Aviso de lead quente */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Aviso de lead quente</div>
              <div className="text-base text-slate-500 mt-1">
                Quando o cliente tá pronto, você recebe no WhatsApp.
              </div>
            </div>

            {/* Anti-bloqueio */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Anti-bloqueio</div>
              <div className="text-base text-slate-500 mt-1">
                Disparos seguros, ritmo natural, simulação humana.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAGAMENTOS */}
      <section id="pagamentos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Recuperação financeira</span>
          <h2 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight">
            Receba pagamentos{" "}
            <span style={{ color: "#004DFF" }}>sem levantar um dedo</span>
            <span className="text-slate-900">.</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            Cobrança automática no WhatsApp. PIX, boleto, lembretes e recuperação de inadimplentes — tudo a IA faz por você.
          </p>
        </div>

        {/* Top row: chat + timeline */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {/* Chat mockup */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" />
                Cobrança automática · WhatsApp
              </div>
            </div>
            <div className="flex-1 p-5 space-y-3 bg-white">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-500 text-white px-4 py-3 text-base">
                <div className="text-[10px] opacity-90 font-semibold mb-1">✦ IA Next Pro</div>
                Olá 👋 Seu pagamento vence hoje. Segue novamente o link para pagamento.
              </div>
              <div className="max-w-[60%] rounded-2xl rounded-tl-sm bg-slate-100 text-slate-800 px-4 py-2 text-base">
                Pode mandar
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-500 text-white px-4 py-3 text-base space-y-2">
                <div className="text-[10px] opacity-90 font-semibold">✦ IA Next Pro</div>
                <div className="font-semibold">Aqui está 👇</div>
                <div className="rounded-lg bg-emerald-600/40 px-2 py-1.5 text-xs">
                  💳 Link de pagamento:<br />pix.nextpro.ai/p/abc123
                </div>
                <div className="rounded-lg bg-emerald-600/40 px-2 py-1.5 text-xs">
                  📄 Boleto também disponível
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-6">
              Recuperação automática
            </div>
            <ul className="space-y-5">
              {[
                { icon: "💵", title: "Cobrança enviada", sub: "Dia do vencimento", dot: "bg-emerald-500" },
                { icon: "🔔", title: "Lembrete automático", sub: "24h antes do vencimento", dot: "bg-amber-400" },
                { icon: "⚠️", title: "Aviso de atraso", sub: "1 dia após vencimento", dot: "bg-orange-400" },
                { icon: "💬", title: "Follow-up humanizado", sub: "3 dias depois · tom suave", dot: "bg-violet-500", highlight: true },
                { icon: "📈", title: "Cliente pagou", sub: "Confirmação automática", dot: "bg-emerald-500" },
              ].map((s) => (
                <li key={s.title} className="flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl ${s.highlight ? "bg-violet-500 text-white" : "bg-slate-100"}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base text-slate-900">{s.title}</div>
                    <div className="text-xs text-slate-500">{s.sub}</div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Middle row: payment methods + stat */}
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 flex items-center justify-around">
            {[
              { icon: <CreditCard className="h-6 w-6" />, label: "PIX" },
              { icon: <CreditCard className="h-6 w-6" />, label: "Boleto" },
              { icon: <CreditCard className="h-6 w-6" />, label: "Link" },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-2 text-slate-600">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  {m.icon}
                </div>
                <span className="text-base">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-8 flex flex-col justify-center">
            <div className="text-5xl font-bold text-emerald-600">+40%</div>
            <p className="mt-2 text-base text-slate-600">
              de clientes inadimplentes pagam com follow-up automático
            </p>
          </div>
        </div>

        {/* Bottom features */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <CreditCard className="h-5 w-5" />, title: "Cobrança no WhatsApp", sub: "Envio automático com link de pagamento" },
            { icon: <Bell className="h-5 w-5" />, title: "Lembrete inteligente", sub: "Aviso antes e no dia do vencimento" },
            { icon: <CreditCard className="h-5 w-5" />, title: "PIX + Boleto", sub: "Links de pagamento direto no chat" },
            { icon: <TrendingUp className="h-5 w-5" />, title: "Recuperação ativa", sub: "Follow-up até o cliente pagar" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
                {f.icon}
              </div>
              <div className="font-semibold text-base text-slate-900">{f.title}</div>
              <div className="text-xs text-slate-500 mt-1">{f.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#004DFF" }}>
              Planos para cada fase
            </span>
            <h2 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
              Escolha o plano{" "}
              <span style={{ color: "#004DFF" }}>ideal pra você</span>
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Comece grátis por 2 dias. Sem cartão, sem fidelidade — mude de plano quando quiser.
            </p>

            <div className="mt-8 inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-full text-base font-semibold transition ${billing === "monthly" ? "text-white" : "text-slate-600"}`}
                style={billing === "monthly" ? { backgroundColor: "#004DFF" } : undefined}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-5 py-2 rounded-full text-base font-semibold transition flex items-center gap-2 ${billing === "annual" ? "text-white" : "text-slate-600"}`}
                style={billing === "annual" ? { backgroundColor: "#004DFF" } : undefined}
              >
                Anual
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${billing === "annual" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                  -2 meses
                </span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {[
              {
                tier: "basic",
                name: "Basic",
                price: "0",
                tagline: "Teste grátis de 2 dias: 20 disparos para explorar",
                highlights: [
                  { strong: "20 disparos", pre: "até ", post: " no total" },
                  { strong: "Bloqueio automático", pre: "", post: " ao atingir o limite" },
                ],
                chips: ["1 atendente", "1 conexão WhatsApp", "IA completa (limitada)", "Chat interno"],
                featured: false,
              },
              {
                tier: "start",
                name: "Start",
                monthlyPrice: "49,90",
                annualPrice: "41,58",
                annualTotal: "499,00",
                tagline: "Para quem está começando",
                highlights: [
                  { strong: "100 disparos", pre: "até ", post: "/mês" },
                  { strong: "1.000", pre: "", post: " créditos de mensagem" },
                ],
                chips: ["5 atendentes", "2 conexões WhatsApp", "IA completa", "Chat interno"],
                featured: false,
              },
              {
                tier: "business",
                name: "Business",
                monthlyPrice: "99,90",
                annualPrice: "83,25",
                annualTotal: "999,00",
                tagline: "Para operações de alto volume",
                highlights: [
                  { strong: "10.000 disparos", pre: "até ", post: "/mês" },
                  { strong: "50.000", pre: "", post: " créditos de mensagem" },
                ],
                chips: ["20 atendentes", "Clientes ilimitados", "Prospecção completa", "Suporte prioritário"],
                featured: true,
              },
            ].map((p) => (
              <div
                key={p.tier}
                className="relative rounded-[28px] bg-slate-50 p-7 text-left"
                style={
                  p.featured
                    ? { border: "1.5px solid #004DFF", boxShadow: "0 20px 60px -25px rgba(0,77,255,0.45)" }
                    : { border: "1px solid #e2e8f0" }
                }
              >
                <div className="text-sm text-slate-400">Plano</div>

                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <div className="text-3xl font-bold tracking-tight text-slate-900">{p.name}</div>
                  <div className="text-right">
                    {p.tier === "basic" ? (
                      <span className="text-3xl font-bold tracking-tight" style={{ color: "#004DFF" }}>Grátis</span>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-end">
                          <span className="text-3xl font-bold tracking-tight text-slate-900">R${billing === "annual" ? p.annualPrice : p.monthlyPrice}</span>
                          <span className="ml-1 text-sm text-slate-400">/mês</span>
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {billing === "annual"
                            ? `R$ ${p.annualTotal} cobrado por ano`
                            : "cobrado por mês"}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold" style={{ color: "#004DFF" }}>
                  {p.tagline}
                </p>

                <div className="my-6 h-px bg-slate-200" />

                <div className="space-y-3">
                  <div className="rounded-2xl px-5 py-4 text-base text-slate-500" style={{ backgroundColor: "rgba(0,77,255,0.06)", border: "1px solid rgba(0,77,255,0.12)" }}>
                    {p.highlights[0].pre}
                    <span className="font-bold text-slate-900">{p.highlights[0].strong}</span>
                    {p.highlights[0].post}
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 text-base text-slate-500">
                    <span className="font-bold text-slate-900">{p.highlights[1].strong}</span>
                    {p.highlights[1].post}
                  </div>
                </div>



                <button
                  onClick={() => setExpandedTier(expandedTier === p.tier ? null : p.tier)}
                  className="mt-7 w-full flex items-center justify-center gap-2 text-sm font-semibold transition hover:opacity-80"
                  style={{ color: "#004DFF" }}
                >
                  {expandedTier === p.tier ? "Ocultar funcionalidades" : "Ver todas as funcionalidades"}
                  <ChevronRight className={`h-4 w-4 transition-transform ${expandedTier === p.tier ? "rotate-90" : ""}`} />
                </button>

                {expandedTier === p.tier && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 animate-fade-in">
                    <ul className="space-y-3">
                      {PLAN_FEATURES[p.tier].map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#004DFF" }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => (window.location.href = `/checkout?tier=${p.tier}&billing=${billing}`)}
                  className="mt-5 w-full rounded-xl py-4 text-lg font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "#004DFF" }}
                >
                  {p.tier === "basic" ? "Testar grátis" : `Assinar ${p.name}`}
                </button>

                <div className="mt-5 flex flex-col items-center">
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4" style={{ color: "#004DFF" }} />
                    Garantia de 30 dias
                  </div>
                  <div className="text-sm text-slate-500">ou seu dinheiro de volta</div>
                </div>

                <div className="mt-6 min-h-[52px] border-t border-slate-200 pt-5">
                  <RotatingChips tier={p.tier} />
                </div>
              </div>
            ))}
          </div>


          {/* BOTÃO COMPARAR PLANOS */}
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setShowCompareTable((s) => !s)}
              className="group inline-flex items-center gap-3 rounded-xl bg-slate-100 px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-200"
            >
              Compare os planos
              <ChevronUp className={`h-4 w-4 transition-transform duration-200 ${showCompareTable ? "" : "rotate-180"}`} />
            </button>
          </div>

          {/* TABELA COMPARATIVA */}
          {showCompareTable && (
            <div className="mt-8 max-w-4xl mx-auto animate-fade-in">
              <h3 className="text-center text-3xl font-bold text-slate-900">Resumo de recursos e limites</h3>
              <p className="mt-2 text-center text-base text-slate-500">Veja lado a lado o que cada plano entrega.</p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-base">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left font-semibold text-slate-700 px-6 py-4">Recurso</th>
                      <th className="text-center font-semibold px-6 py-4" style={{ color: "#004DFF" }}>Basic</th>
                      <th className="text-center font-semibold text-slate-700 px-6 py-4">Start</th>
                      <th className="text-center font-semibold px-6 py-4" style={{ color: "#004DFF" }}>Business</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {[
                      [
                        billing === "monthly" ? "Preço mensal" : "Preço anual (por mês)",
                        "Grátis",
                        billing === "monthly" ? "R$ 49,90" : "R$ 41,58",
                        billing === "monthly" ? "R$ 99,90" : "R$ 83,25",
                      ],
                      [billing === "annual" ? "Cobrança anual" : "", "—", billing === "annual" ? "R$ 499,00 cobrado por ano" : "—", billing === "annual" ? "R$ 999,00 cobrado por ano" : "—"],
                      ["Atendentes", "1", "5", "20"],
                      ["Conexões WhatsApp", "1", "2", "10"],
                      ["Usuários", "2", "10/mês", "Ilimitados"],
                      ["Contatos", "50", "500/mês", "10.000/mês"],
                      ["Disparos em massa", "20 no total", "100/mês", "Até 10.000/mês"],
                      ["Vendas e cobranças", "50", "500/mês", "Ilimitadas"],
                      ["Fluxos de IA", "1", "3/mês", "Ilimitados"],
                      ["Agentes de IA", "1", "3/mês", "Ilimitados"],
                      ["Departamentos", "1", "4/mês", "Ilimitados"],
                      ["IA completa (Aurora)", true, true, true],
                      ["Histórico de atendimentos", true, true, true],
                      ["Segmentação de contatos", true, true, true],
                      ["Chat interno", true, true, true],
                      ["Relatórios", "Básicos", "Básicos", "Avançados"],
                      ["Prospecção Google Maps", false, false, true],
                      ["Prospecção Instagram/TikTok", false, false, true],
                      ["Espionar anúncios", false, false, true],
                      ["Voz clonada (ElevenLabs)", false, false, true],
                      ["API + Webhooks", false, false, true],
                      ["Suporte", "E-mail", "E-mail", "Prioritário"],
                      ["Teste grátis", "2 dias", "2 dias", "2 dias"],

                    ].map(([label, basic, start, business], idx) => (
                      <tr key={label as string} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                        <td className="px-6 py-3.5 font-medium text-slate-800">{label as string}</td>
                        <td className="px-6 py-3.5 text-center">
                          {typeof basic === "boolean" ? (
                            basic ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">—</span>
                            )
                          ) : (
                            <span className="font-semibold" style={{ color: "#004DFF" }}>{basic}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {typeof start === "boolean" ? (
                            start ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">—</span>
                            )
                          ) : (
                            <span>{start}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {typeof business === "boolean" ? (
                            business ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">—</span>
                            )
                          ) : (
                            <span className="font-semibold" style={{ color: "#004DFF" }}>{business}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* VOZ CLONADA */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#004DFF" }} />
              Tecnologia exclusiva
            </span>
            <h2 className="mt-5 text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Sua <span style={{ color: "#004DFF" }}>voz clonada</span>,<br />
              respondendo por você.
            </h2>
            <p className="mt-5 text-slate-600 text-lg leading-relaxed">
              Grave 60 segundos da sua voz. A IA clona e envia áudios automáticos no WhatsApp — tão naturais que o cliente jura que é você.
            </p>
            <ul className="mt-6 space-y-3 text-base text-slate-700">
              {["Áudios ultra naturais em português", "Atendimento humanizado em escala", "Mais retenção, mais conversão", "Cliente sente que está falando com gente"].map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300">
                    <Check className="h-3 w-3 text-slate-500" />
                  </span>
                  {i}
                </li>
              ))}
            </ul>
            <Link to="/auth">
              <Button className="mt-8 rounded-full px-6 py-6 text-white shadow-lg hover:opacity-90" style={{ backgroundColor: "#004DFF" }}>
                Clonar minha voz <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#004DFF" }}>
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">Sua voz · IA Next Pro</div>
                <div className="text-xs text-slate-500">Clonada com 60s de áudio</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="h-14 w-14 rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-opacity flex-shrink-0" style={{ backgroundColor: "#004DFF" }}>
                <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
              </button>
              <div className="flex gap-[3px] h-12 items-center flex-1">
                {[...Array(48)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${25 + Math.abs(Math.sin(i * 0.7)) * 70 + Math.abs(Math.cos(i * 1.3)) * 20}%`,
                      backgroundColor: "#004DFF",
                      opacity: 0.75,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">0:18</span>
            </div>
            <p className="text-center text-xs text-slate-500 mt-4">Clique no play e ouça uma amostra agora.</p>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
              {[
                { v: "60s", l: "pra clonar" },
                { v: "100%", l: "natural" },
                { v: "pt-BR", l: "nativo" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#004DFF" }}>{s.v}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEGMENTOS */}
      <section id="segmentos" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#004DFF" }}>
            Pra qualquer negócio
          </span>
          <h2 className="mt-4 text-4xl md:text-6xl font-bold font-space-grotesk">
            Funciona pro{" "}
            <span style={{ color: "#004DFF" }}>seu segmento.</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            A IA se adapta ao seu nicho. Prospecção e atendimento ajustados ao seu mercado.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-3 gap-5">
          {segments.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center hover:border-primary/40 hover:shadow-sm transition-all">
              <s.icon className="h-7 w-7 mx-auto" style={{ color: "#004DFF" }} strokeWidth={1.75} />
              <div className="mt-4 text-base font-medium text-slate-700">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CENTRAL COMPLETA */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#004DFF" }} />
              Tudo em um único painel
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold">
              Sua central comercial <span style={{ color: "#004DFF" }}>completa.</span>
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Prospecção, IA, CRM, cobrança e campanhas — organizados, sem complicação.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {[
              {
                icon: Target, title: "Prospecção",
                items: [
                  { i: MapPin, l: "Google Maps" },
                  { i: Instagram, l: "Instagram" },
                  { i: FileText, l: "Base CNPJ" },
                  { i: UsersRound, l: "Grupos WhatsApp" },
                ],
              },
              {
                icon: Bot, title: "IA & Automação",
                items: [
                  { i: Headphones, l: "Atendimento IA" },
                  { i: Volume2, l: "Áudio IA" },
                  { i: Mic, l: "Clonagem de voz" },
                  { i: Repeat, l: "Follow-up automático" },
                ],
              },
              {
                icon: Wallet, title: "Comercial & Cobrança",
                items: [
                  { i: TrendingUp, l: "CRM / Funil" },
                  { i: Receipt, l: "Cobranças automáticas" },
                  { i: CreditCard, l: "PIX e boleto" },
                  { i: AlertCircle, l: "Recuperação de inadimplentes" },
                ],
              },
              {
                icon: Megaphone, title: "Comunicação",
                items: [
                  { i: Send, l: "Campanhas em massa" },
                  { i: MessageSquare, l: "Múltiplos WhatsApps" },
                  { i: ListChecks, l: "Respostas rápidas" },
                  { i: Ban, l: "Listas e blacklist" },
                ],
              },
            ].map((group) => (
              <div key={group.title} className="rounded-2xl bg-white border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <group.icon className="h-5 w-5" style={{ color: "#004DFF" }} />
                  </div>
                  <div className="font-semibold text-xl">{group.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {group.items.map((it) => (
                    <div key={it.l} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-base text-slate-700">
                      <it.i className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{it.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASOS REAIS */}
      <section id="depoimentos" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "#004DFF" }}>
              // Casos reais
            </span>
            <h2 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
              Antes e depois de{" "}
              <span style={{ color: "#004DFF" }}>clientes reais</span>
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Resultados reais de empresas que automatizaram atendimento, vendas e cobrança com o CRM Next Pro. Verificados por prints e relatos dos próprios clientes.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-2 gap-6">
            {cases.map((c) => (
              <div key={c.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <img src={c.avatar} alt={c.name} className="h-11 w-11 rounded-full object-cover" />
                    <div>
                      <div className="font-semibold text-slate-900 text-base">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.role}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-[#004DFF] border border-blue-100">
                    {c.plan}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Antes</span>
                    </div>
                    <div className="space-y-2.5">
                      {c.before.map((item) => (
                        <div key={item.label}>
                          <div className="text-xs text-slate-600">{item.label}</div>
                          <div className="text-xs font-semibold text-slate-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50/50 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#004DFF]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#004DFF]">Depois</span>
                    </div>
                    <div className="space-y-2.5">
                      {c.after.map((item) => (
                        <div key={item.label}>
                          <div className="text-xs text-slate-600">{item.label}</div>
                          <div className="text-xs font-semibold text-[#004DFF]">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#004DFF]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {c.result}
                </div>

                <div className="mt-5 pt-5 border-t border-slate-100">
                  <div className="flex gap-2">
                    <Quote className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                    <p className="text-base text-slate-600 leading-relaxed">{c.quote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-slate-500 inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              Métricas compartilhadas voluntariamente pelos clientes · Prints e comprovantes sob solicitação
            </p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-12 md:p-16 text-center text-white shadow-2xl">
          <h2 className="text-4xl md:text-6xl font-bold">Quero vender no automático.</h2>
          <p className="mt-4 opacity-90 max-w-xl mx-auto">
            Prospecção + WhatsApp + IA + cobrança automática — em uma única plataforma.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mt-8 bg-white text-primary-dark hover:bg-slate-100 rounded-full px-8 h-12 font-semibold">
              Começar Teste Grátis <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Brand */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <img src={logoAurora.url} alt="NEXT PRO" className="h-6 w-6" />
                <span className="text-base font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  NEXT <span className="text-primary">PRO</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-snug max-w-sm whitespace-pre-line">
                O CRM NEXT PRO é a ferramenta definitiva para quem deseja{"\u00a0"}{"\n"}executar disparos em massa, prospectar clientes e aumentar suas vendas, tudo em uma unica ferramenta.
              </p>
              <div className="flex items-center gap-1.5">
                <a href="#" aria-label="Twitter" className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors">
                  <Twitter className="h-3 w-3" />
                </a>
                <a href="#" aria-label="Instagram" className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors">
                  <Instagram className="h-3 w-3" />
                </a>
                <a href="#" aria-label="Presentes" className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors">
                  <Gift className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Produto */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Produto</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li><a href="#recursos" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><a href="#planos" className="hover:text-primary transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Download</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Suporte */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Suporte</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li><Link to="/central-de-ajuda" className="flex items-center gap-1.5 hover:text-primary transition-colors"><HelpCircle className="h-3.5 w-3.5" /> Central de Ajuda</Link></li>
                <li><a href="#" className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-600 transition-colors"><MessageCircle className="h-3.5 w-3.5" /> Comunidade VIP</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Legal</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li><Link to="/politica-de-privacidade" className="flex items-center gap-1.5 hover:text-primary transition-colors"><Shield className="h-3.5 w-3.5" /> Privacidade</Link></li>
                <li><Link to="/termos-de-servico" className="flex items-center gap-1.5 hover:text-primary transition-colors"><FileText className="h-3.5 w-3.5" /> Termos de Uso</Link></li>
                <li><Link to="/politica-de-cookies" className="flex items-center gap-1.5 hover:text-primary transition-colors"><Cookie className="h-3.5 w-3.5" /> Cookies</Link></li>
              </ul>
              <p className="text-[11px] text-slate-400 pt-0.5">CNPJ - 65.146.817/0001-18</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] tracking-widest uppercase text-slate-400">
            <div>© {new Date().getFullYear()} Next Pro — Todos os direitos reservados</div>
            <div className="flex items-center gap-1.5">
              Feito com precisão no <span className="font-semibold text-slate-700">Brasil</span>
              <img
                src="https://flagcdn.com/br.svg"
                alt="Bandeira do Brasil"
                width={18}
                height={13}
                className="inline-block rounded-[2px] shadow-sm"
              />
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">{selectedLead?.name}</DialogTitle>
                <DialogDescription className="text-xs">Lead capturado automaticamente</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 text-base">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <PhoneCall className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-900">{selectedLead?.phone}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span className="text-slate-700">Origem: <span className="font-medium text-slate-900">{selectedLead?.origin}</span></span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                if (selectedLead) window.open(`tel:${selectedLead.phone.replace(/\D/g, "")}`);
              }}
            >
              <PhoneCall className="h-4 w-4 mr-2" /> Chamar agora
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (selectedLead) setSavedLeads((s) => Array.from(new Set([...s, selectedLead.name])));
                setSelectedLead(null);
              }}
            >
              <Target className="h-4 w-4 mr-2" />
              {selectedLead && savedLeads.includes(selectedLead.name) ? "Já no funil" : "Salvar no funil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
