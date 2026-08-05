import { Link } from "react-router-dom";
import imgPadaria from "@/assets/biz/padaria.jpg.asset.json";
import imgOficina from "@/assets/biz/oficina.jpg.asset.json";
import imgSalao from "@/assets/biz/salao.jpg.asset.json";
import heroVideoAsset from "@/assets/hero.mp4.asset.json";
import logoAurora from "@/assets/logo-aurora.png.asset.json";
import avatarRafael from "@/assets/cases/rafael.png.asset.json";
import avatarIsabela from "@/assets/cases/isabela.png.asset.json";
import avatarDiego from "@/assets/cases/diego.png.asset.json";
import avatarLarissa from "@/assets/cases/larissa.png.asset.json";
import iconGoogle from "@/assets/integrations/google.png.asset.json";
import iconWhatsapp from "@/assets/integrations/whatsapp.png.asset.json";
import iconInstagram from "@/assets/integrations/instagram.png.asset.json";
import iconMeta from "@/assets/integrations/meta.png.asset.json";
import iconTiktok from "@/assets/integrations/tiktok.png.asset.json";
import iconCalendar from "@/assets/integrations/calendar.png.asset.json";
import iconOpenai from "@/assets/integrations/openai.png.asset.json";
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
  Trophy, Globe, Mail, BarChart3, Tag
} from "lucide-react";
import { ProspeccaoMapWindow } from "@/components/landing/ProspeccaoMapWindow";
import CookieConsent from "@/components/landing/CookieConsent";
import LandingFAQ from "@/components/landing/LandingFAQ";
import { ChatWidget } from "@/components/landing/ChatWidget";
import { OnboardingSteps } from "@/components/landing/OnboardingSteps";
import { KanbanMockup } from "@/components/landing/KanbanMockup";



const EMOJIS = ["😀","😂","😍","🥳","🚀","🔥","👍","🙏","💜","✨","✅","💡","📞","📎","🎉","💬","🤖","💰","📈","🎯"];

const stats = [
  { value: "+2.1M", label: "Mensagens enviadas" },
  { value: "+8.000", label: "Empresas conectadas" },
  { value: "+450k", label: "Leads captados" },
  { value: "24/7", label: "IA em operação" },
];

const segments = [
  { icon: Building2, label: "Imobiliária", desc: "Captação de imóveis e follow-up de visitas", span: "md:col-span-2" },
  { icon: Stethoscope, label: "Dentista", desc: "Agenda cheia e retorno de pacientes", span: "md:col-span-1" },
  { icon: Scale, label: "Advogado", desc: "Triagem de casos no WhatsApp", span: "md:col-span-1" },
  { icon: Activity, label: "Clínica", desc: "Confirmação e lembretes automáticos", span: "md:col-span-1" },
  { icon: Scissors, label: "Estética", desc: "Recompra de procedimentos e pacotes", span: "md:col-span-2" },
  { icon: Sun, label: "Energia Solar", desc: "Qualificação de leads e orçamentos", span: "md:col-span-1" },
  { icon: Store, label: "Loja", desc: "Vitrine no chat e cobrança por PIX", span: "md:col-span-1" },
  { icon: Wrench, label: "Oficina", desc: "Revisões programadas e orçamentos", span: "md:col-span-1" },
  { icon: Utensils, label: "Restaurante", desc: "Pedidos, reservas e campanhas", span: "md:col-span-2" },
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

// Metadados de credibilidade (dados de operação reais informados pelos clientes)
const caseMeta: Record<string, {
  location: string;
  since: string;
  period: string;
  verifiedAt: string;
  bars: number[];
  deltas: string[];
  kpis: { label: string; value: string }[];
}> = {
  "Rafael Monteiro": {
    location: "São Paulo · SP",
    since: "Cliente desde fev/2025",
    period: "Comparativo: 90 dias antes × 90 dias depois",
    verifiedAt: "Verificado em jul/2026",
    bars: [96, 67, 93],
    deltas: ["-99,9% no tempo", "-4 atendentes", "-92% de perda"],
    kpis: [
      { label: "Conversas/mês", value: "11.4k" },
      { label: "Resposta média", value: "8s" },
      { label: "CSAT", value: "4.9" },
    ],
  },
  "Isabela Rocha": {
    location: "Belo Horizonte · MG",
    since: "Cliente desde set/2025",
    period: "Comparativo: 60 dias antes × 60 dias depois",
    verifiedAt: "Verificado em jun/2026",
    bars: [71, 74, 71],
    deltas: ["+245% agendamentos", "+R$ 52,8k/mês", "-22 p.p. de no-show"],
    kpis: [
      { label: "Lembretes IA", value: "1.9k/mês" },
      { label: "Ocupação agenda", value: "88%" },
      { label: "CSAT", value: "4.8" },
    ],
  },
  "Diego Almeida": {
    location: "Curitiba · PR",
    since: "Cliente desde jan/2026",
    period: "Comparativo: 30 dias antes × 30 dias depois",
    verifiedAt: "Verificado em jul/2026",
    bars: [100, 65, 81],
    deltas: ["+R$ 24,7k/mês", "+65% no ticket", "-47 p.p. de atraso"],
    kpis: [
      { label: "Carrinhos recup.", value: "312/mês" },
      { label: "Pix confirmado", value: "74%" },
      { label: "CSAT", value: "4.7" },
    ],
  },
  "Larissa Pinto": {
    location: "Recife · PE",
    since: "Cliente desde nov/2025",
    period: "Comparativo: 90 dias antes × 90 dias depois",
    verifiedAt: "Verificado em jun/2026",
    bars: [85, 65, 77],
    deltas: ["+589% em volume", "+3,5 p.p. conversão", "-77% no CAC"],
    kpis: [
      { label: "Coletores ativos", value: "3" },
      { label: "Leads/dia", value: "41" },
      { label: "CSAT", value: "4.9" },
    ],
  },
};

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

const IDEAL_PARA = [
  { icon: Wrench, label: "Prestadores de Serviço" },
  { icon: Stethoscope, label: "Clínicas Odontológicas" },
  { icon: Activity, label: "Clínicas e Consultórios" },
  { icon: Building2, label: "Imobiliárias" },
  { icon: Scale, label: "Advogados" },
  { icon: Store, label: "E-commerce" },
];

function IdealParaMarquee() {
  const loop = [...IDEAL_PARA, ...IDEAL_PARA, ...IDEAL_PARA];
  return (
    <section className="border-y border-slate-200/70 bg-[#faf9f6] py-8">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
        Ideal para
      </p>
      <div className="chip-marquee mt-5 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div
          className="chip-marquee-track flex w-max items-center gap-8"
          style={{ animationDuration: `${IDEAL_PARA.length * 6}s` }}
        >
          {loop.map((item, i) => (
            <div key={`${i}-${item.label}`} className="flex shrink-0 items-center gap-8">
              <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[15px] text-slate-700">
                <item.icon className="h-[18px] w-[18px] text-[#004DFF]" />
                {item.label}
              </span>
              <span className="text-slate-300">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MERCADO_CARDS = [
  {
    img: imgPadaria.url,
    title: "Padaria de bairro",
    desc: "pedido novo enquanto o balcão está cheio",
    className: "lg:col-span-2 h-[240px]",
  },
  {
    img: imgSalao.url,
    title: "Salão independente",
    desc: "agenda andando sem parar o atendimento",
    className: "lg:row-span-2 h-[560px]",
  },
  {
    img: imgOficina.url,
    title: "Oficina local",
    desc: "orçamento respondido no meio do serviço",
    className: "lg:col-span-2 h-[300px]",
  },
];

function MercadoSection() {
  return (
    <section className="relative overflow-hidden bg-[#f4f1ec] text-slate-900">
      <div className="relative mx-auto max-w-[1240px] px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <span className="flex items-center gap-2 text-sm font-semibold text-[#004DFF]">
              <span className="h-2 w-2 rounded-full bg-[#004DFF]" />
              O mercado acontece enquanto você trabalha
            </span>
            <h2 className="mt-6 text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1.05] tracking-tight font-space-grotesk">
              <span className="block">Por trás de cada</span>
              <span className="block">WhatsApp, tem</span>
              <span className="block">alguém fazendo o</span>
              <span className="block">negócio acontecer.</span>
            </h2>
          </div>

          <div className="lg:pt-24">
            <p className="text-lg leading-relaxed text-slate-600">
              O cliente chama quando a mão está na massa, o salão está cheio ou o próximo
              serviço já começou. A oportunidade não deveria depender de alguém parar tudo
              para responder.
            </p>
            <div className="mt-8 border-t border-slate-900/15 pt-6">
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#004DFF]" />
                <span>
                  A Next Pro mantém a conversa andando — com o jeito e as regras do seu negócio.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {MERCADO_CARDS.map((c) => (
            <div
              key={c.title}
              className={`group relative overflow-hidden rounded-2xl ${c.className}`}
            >
              <img
                src={c.img}
                alt={c.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                <div>
                  <p className="text-2xl font-medium text-white">{c.title}</p>
                  <p className="mt-1 max-w-[260px] text-sm text-white/70">{c.desc}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#004DFF] px-4 py-1.5 text-xs font-semibold text-white">
                  IA atendendo
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-10 border-t border-slate-900/15 pt-10 md:grid-cols-3">
          {[
            { v: "99%", d: "dos smartphones brasileiros têm WhatsApp" },
            { v: "8 em 10", d: "consumidores já conversam com empresas por lá" },
            { v: "5 min", d: "é a janela em que o interesse ainda está quente" },
          ].map((s) => (
            <div key={s.v}>
              <p className="text-4xl font-medium text-[#004DFF]">{s.v}</p>
              <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
      {items.map((i) => (
        <span key={i} className="flex items-center gap-2 text-sm text-slate-700">
          <Check className="h-4 w-4 text-[#004DFF]" strokeWidth={3} />
          {i}
        </span>
      ))}
    </div>
  );
}

type HeroQA = { q: string; a: string };

function FluxoCompletoSection() {
  return (
    <section className="bg-[#f4f1ec]">
      <div className="mx-auto max-w-[1240px] px-6 py-24">
        {/* Cabeçalho */}
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
          <div>
            <span className="flex items-center gap-2 text-sm font-semibold text-[#004DFF]">
              <span className="h-2 w-2 rounded-full bg-[#004DFF]" />
              Tudo funciona junto
            </span>
            <h2 className="mt-5 font-space-grotesk text-4xl md:text-5xl lg:text-[3.4rem] leading-[1.08] tracking-tight text-slate-900">
              <span className="block">Da primeira mensagem</span>
              <span className="block">ao pagamento.</span>
              <span className="block">Sem trocar de tela.</span>
            </h2>
          </div>
          <p className="text-slate-500 leading-relaxed lg:pb-3">
            <span className="block">Um único fluxo para atender, vender, organizar</span>
            <span className="block">e trazer o cliente de volta — com a IA cuidando</span>
            <span className="block">do trabalho repetitivo.</span>
          </p>

        </div>

        {/* Cards */}
        <div className="mt-14 grid lg:grid-cols-2 gap-6">
          {/* 1 — Atendimento */}
          <div className="rounded-3xl bg-white/70 border border-slate-200/70 p-5">
            <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#004DFF] text-[10px] font-bold text-white">A</span>
                  <span className="text-xs font-semibold text-slate-900">Conversas</span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#004DFF]" /> IA online
                </span>
              </div>
              <div className="grid grid-cols-[40%_60%] min-h-[300px]">
                <div className="border-r border-slate-100 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] text-slate-400">
                    <Search className="h-3 w-3" /> Buscar conversa
                  </div>
                  {[
                    { n: "Marina Costa", m: "Quero agendar para amanhã", t: "10:42", active: true },
                    { n: "Rafael Lima", m: "Pode me enviar o orçamento?", t: "10:31" },
                    { n: "Ana Souza", m: "Obrigada pelo atendimento!", t: "09:58" },
                  ].map((c) => (
                    <div
                      key={c.n}
                      className={`flex items-start gap-2 rounded-xl px-2 py-2 ${c.active ? "bg-[#004DFF]/10" : ""}`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${c.active ? "bg-[#004DFF] text-white" : "bg-slate-100 text-slate-500"}`}>
                        {c.n.split(" ").map((p) => p[0]).join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[10px] font-semibold text-slate-900">{c.n}</span>
                          <span className="text-[9px] text-slate-400">{c.t}</span>
                        </div>
                        <div className="truncate text-[9px] text-slate-500">{c.m}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-900">Marina Costa</div>
                      <div className="text-[9px] font-medium text-[#004DFF]">Lead qualificado · agora</div>
                    </div>
                    <span className="rounded-full bg-[#004DFF]/10 px-2 py-0.5 text-[9px] font-medium text-[#004DFF]">IA atendendo</span>
                  </div>
                  <div className="mt-4 flex-1 space-y-2">
                    <div className="w-fit max-w-[85%] rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                      Oi! Tem horário amanhã depois das 14h?
                    </div>
                    <div className="ml-auto w-fit max-w-[85%] rounded-xl bg-[#004DFF] px-3 py-2 text-[10px] text-white">
                      Temos às 14h30 e 16h. Qual funciona melhor?
                      <div className="mt-0.5 text-right text-[8px] text-white/70">10:42 ✓✓</div>
                    </div>
                    <div className="w-fit max-w-[85%] rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                      14h30, por favor 😊
                    </div>
                    <div className="ml-auto w-fit rounded-full bg-[#004DFF]/10 px-2.5 py-1 text-[9px] font-medium text-[#004DFF]">
                      Agendamento criado
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-full border border-slate-200 px-3 py-2 text-[10px] text-slate-400">
                    Digite uma mensagem...
                    <Send className="h-3 w-3 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-1 pt-6">
              <span className="text-sm font-semibold text-[#004DFF]">Atendimento</span>
              <h3 className="mt-2 font-space-grotesk text-2xl md:text-[1.75rem] leading-snug text-slate-900">
                Responda, qualifique e venda — até dormindo.
              </h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                A IA atende na hora, consulta sua base e entrega a conversa pronta para você assumir.
              </p>
              <CheckList items={["24h online", "Handoff humano", "Histórico completo"]} />
            </div>
          </div>

          {/* 2 — Agenda + pagamentos */}
          <div className="rounded-3xl bg-white/70 border border-slate-200/70 p-5">
            <div className="rounded-2xl bg-white border border-slate-200/80 p-4 min-h-[344px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900">Agenda</div>
                  <div className="text-[10px] text-slate-400">Junho de 2026</div>
                </div>
                <Calendar className="h-4 w-4 text-[#004DFF]" />
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {[
                  { d: "SEG", n: "08" },
                  { d: "TER", n: "09", active: true },
                  { d: "QUA", n: "10" },
                  { d: "QUI", n: "11" },
                  { d: "SEX", n: "12" },
                ].map((day) => (
                  <div
                    key={day.d}
                    className={`rounded-xl border px-2 py-2 text-center ${day.active ? "border-[#004DFF] bg-[#004DFF] text-white" : "border-slate-200 text-slate-500"}`}
                  >
                    <div className="text-[8px] font-medium tracking-wide">{day.d}</div>
                    <div className={`text-sm font-semibold ${day.active ? "text-white" : "text-slate-900"}`}>{day.n}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-slate-900">Marina Costa</div>
                    <div className="text-[9px] text-slate-500">14h30 · Avaliação</div>
                  </div>
                  <span className="text-[9px] font-medium text-[#004DFF]">Confirmado</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">PIX</span>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-slate-900">Sinal recebido</div>
                    <div className="text-[9px] text-slate-500">Marina · agora</div>
                  </div>
                  <span className="text-[10px] font-semibold text-[#004DFF]">+ R$ 80</span>
                </div>
              </div>
            </div>
            <div className="px-1 pt-6">
              <span className="text-sm font-semibold text-[#004DFF]">Agenda + pagamentos</span>
              <h3 className="mt-2 font-space-grotesk text-2xl md:text-[1.75rem] leading-snug text-slate-900">
                Horário marcado. Lembrete enviado. PIX recebido.
              </h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                O cliente resolve tudo na conversa, sem formulário, ligação ou troca de aplicativo.
              </p>
              <CheckList items={["Menos faltas", "Google Calendar", "Cobrança automática"]} />
            </div>
          </div>

          {/* 3 — CRM automático */}
          <div className="rounded-3xl bg-white/70 border border-slate-200/70 p-5">
            <div className="rounded-2xl bg-white border border-slate-200/80 p-4 min-h-[300px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900">Pipeline de vendas</div>
                  <div className="text-[10px] text-slate-400">Atualizado pelas conversas</div>
                </div>
                <span className="rounded-full bg-[#004DFF]/10 px-2 py-0.5 text-[9px] font-medium text-[#004DFF]">25 oportunidades</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { t: "Novos", n: 8, dot: "bg-[#004DFF]", vals: ["R$ 890", "R$ 450", "R$ 1.200"] },
                  { t: "Qualificados", n: 5, dot: "bg-amber-400", vals: ["R$ 890", "R$ 450", "R$ 1.200"] },
                  { t: "Fechados", n: 12, dot: "bg-emerald-500", vals: ["R$ 890", "R$ 450"] },
                ].map((col) => (
                  <div key={col.t} className="rounded-xl bg-slate-50 p-2">
                    <div className="flex items-center justify-between px-1 pb-2">
                      <span className="text-[9px] font-semibold text-slate-700">{col.t}</span>
                      <span className="text-[9px] text-slate-400">{col.n}</span>
                    </div>
                    <div className="space-y-1.5">
                      {col.vals.map((v, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-white p-2">
                          <span className={`block h-1.5 w-1.5 rounded-full ${col.dot}`} />
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[8px] text-slate-500">WhatsApp</span>
                            <span className="text-[8px] font-semibold text-slate-900">{v}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-1 pt-6">
              <span className="text-sm font-semibold text-[#004DFF]">CRM automático</span>
              <h3 className="mt-2 font-space-grotesk text-2xl md:text-[1.75rem] leading-snug text-slate-900">
                Cada conversa já nasce com um próximo passo.
              </h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Leads, tags, histórico e oportunidades se organizam enquanto o atendimento acontece.
              </p>
              <CheckList items={["Pipeline visual", "Tags automáticas", "Sem planilhas"]} />
            </div>
          </div>

          {/* 4 — Crescimento */}
          <div className="rounded-3xl bg-white/70 border border-slate-200/70 p-5">
            <div className="grid grid-cols-[1.6fr_1fr] gap-3 min-h-[300px]">
              <div className="rounded-2xl bg-white border border-slate-200/80 p-4 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Campanha de reativação</div>
                    <div className="text-[10px] text-slate-400">Clientes sem contato há 30 dias</div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-[#004DFF]" />
                </div>
                <div className="mt-5 flex flex-1 items-end gap-2">
                  {[100, 82, 60, 46, 34, 22, 14].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-[#004DFF]" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400">Conversões</span>
                  <span className="text-sm font-bold text-slate-900">+26 vendas</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { icon: FileText, t: "Base consultada", d: "Resposta com fonte" },
                  { icon: MessageSquare, t: "1.240 envios", d: "Segmentados" },
                ].map((c) => (
                  <div key={c.t} className="flex flex-1 items-center gap-2 rounded-2xl bg-white border border-slate-200/80 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#004DFF]/10 text-[#004DFF]">
                      <c.icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-slate-900 leading-tight">{c.t}</div>
                      <div className="text-[9px] text-slate-400">{c.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-1 pt-6">
              <span className="text-sm font-semibold text-[#004DFF]">Crescimento</span>
              <h3 className="mt-2 font-space-grotesk text-2xl md:text-[1.75rem] leading-snug text-slate-900">
                Sua base volta a conversar — e a comprar.
              </h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Segmente campanhas, reative contatos e acompanhe o que realmente virou receita.
              </p>
              <CheckList items={["Campanhas", "Prospecção", "Métricas de receita"]} />
            </div>
          </div>
        </div>

        {/* Rodapé da seção */}
        <div className="mt-14 border-t border-slate-300/60 pt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="text-sm font-bold text-slate-900">E ainda vem com</span>
          {["Orçamentos", "Campanhas", "Prospecção", "Base de conhecimento", "Múltiplos agentes", "API + webhooks"].map((t) => (
            <span key={t} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-[#004DFF]" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}




const HERO_SEGMENTS: { name: string; greeting: string; qa: HeroQA[] }[] = [
  {
    name: "Clínica",
    greeting: "Oi! 😄 Sou o agente da clínica. Como posso ajudar você hoje?",
    qa: [
      { q: "Tem horário amanhã à tarde?", a: "Tenho sim! 🗓️ Amanhã às 14h30, 16h ou 17h15. Qual fica melhor pra você?" },
      { q: "Vocês atendem convênio?", a: "Atendemos os principais convênios e também particular com desconto à vista. Qual é o seu plano?" },
      { q: "Quanto custa a consulta?", a: "A avaliação particular fica R$ 180 e já inclui o plano de tratamento. Posso reservar um horário?" },
      { q: "Onde vocês ficam?", a: "Estamos na Av. Paulista, 1200 — 5º andar, com estacionamento no prédio. Te envio a localização no WhatsApp? 📍" },
      { q: "Pode remarcar meu horário?", a: "Claro! Já localizei seu agendamento. Prefere quinta às 10h ou sexta às 15h?" },
    ],
  },
  {
    name: "Imobiliária",
    greeting: "Olá! 🏡 Posso te ajudar a encontrar o imóvel ideal. O que procura?",
    qa: [
      { q: "Tem apartamento de 2 quartos?", a: "Tenho 7 opções de 2 quartos entre R$ 320 mil e R$ 480 mil. Prefere pronto pra morar ou na planta?" },
      { q: "Aceitam financiamento?", a: "Sim! Trabalhamos com Caixa e Itaú, com entrada a partir de 10%. Quer uma simulação agora?" },
      { q: "Posso agendar uma visita?", a: "Posso agendar hoje mesmo 😊 Tenho horários às 15h e às 18h. Qual prefere?" },
      { q: "Qual o valor do condomínio?", a: "O condomínio fica em R$ 420 com água inclusa e IPTU de R$ 110/mês." },
    ],
  },
  {
    name: "Loja",
    greeting: "Oi! 🛍️ Bem-vindo(a). Posso te ajudar com pedidos, trocas e entregas.",
    qa: [
      { q: "Esse produto tem em estoque?", a: "Tem sim! Restam 4 unidades no tamanho M e 2 no G. Quer que eu separe o seu?" },
      { q: "Qual o prazo de entrega?", a: "Para o seu CEP a entrega sai em 2 a 4 dias úteis, com frete grátis acima de R$ 199. 🚚" },
      { q: "Aceitam parcelamento?", a: "Sim, em até 12x no cartão ou 10% de desconto no Pix. Como prefere pagar?" },
      { q: "Como faço uma troca?", a: "Você tem 30 dias para trocar. Só me passar o número do pedido que eu já gero a etiqueta. 📦" },
    ],
  },
  {
    name: "Serviços",
    greeting: "Olá! 👋 Sou o agente da equipe. Me conta o que você precisa?",
    qa: [
      { q: "Fazem orçamento sem custo?", a: "Fazemos! O orçamento é gratuito e sai em até 1 hora. Pode me descrever o serviço?" },
      { q: "Atendem no fim de semana?", a: "Sim, sábado das 8h às 14h e domingo com plantão para urgências." },
      { q: "Quanto tempo demora?", a: "Na média o serviço leva 2 a 3 horas e já sai com garantia de 90 dias. ✅" },
      { q: "Atendem minha região?", a: "Atendemos toda a região metropolitana sem taxa extra. Qual é o seu bairro?" },
    ],
  },
];

function HeroChatCard() {
  const [segment, setSegment] = useState(0);
  const [messages, setMessages] = useState<{ from: "ai" | "user"; text: string }[]>([
    { from: "ai", text: HERO_SEGMENTS[0].greeting },
  ]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => timersRef.current.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const selectSegment = (i: number) => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setSegment(i);
    setAsked([]);
    setTyping(false);
    setMessages([{ from: "ai", text: HERO_SEGMENTS[i].greeting }]);
  };

  const ask = (item: HeroQA) => {
    if (typing) return;
    setMessages((m) => [...m, { from: "user", text: item.q }]);
    setAsked((a) => [...a, item.q]);
    setTyping(true);
    const t = window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: "ai", text: item.a }]);
    }, 1100);
    timersRef.current.push(t);
  };

  const sendFree = async () => {
    const text = draft.trim();
    if (!text || typing) return;
    setDraft("");
    setMessages((m) => [...m, { from: "user", text }]);
    setTyping(true);

    const seg = HERO_SEGMENTS[segment];
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const n = norm(text);
    const local = seg.qa.find((item) => {
      const words = norm(item.q).split(/\W+/).filter((w) => w.length > 4);
      return words.some((w) => n.includes(w));
    });

    if (local) {
      const t = window.setTimeout(() => {
        setTyping(false);
        setAsked((a) => [...a, local.q]);
        setMessages((m) => [...m, { from: "ai", text: local.a }]);
      }, 900);
      timersRef.current.push(t);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("landing-aurora-chat", {
        body: {
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text })),
          context: `Você é o agente de IA de uma empresa do segmento "${seg.name}". Responda em português, curto (até 2 frases), simpático e comercial.`,
        },
      });
      const reply = (data as any)?.reply || (data as any)?.text;
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          from: "ai",
          text:
            !error && reply
              ? reply
              : "Consigo te ajudar com isso! 😊 Me conta um pouco mais — ou clique numa das perguntas sugeridas.",
        },
      ]);
    } catch {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { from: "ai", text: "Consigo te ajudar com isso! 😊 Me conta um pouco mais sobre o que você precisa." },
      ]);
    }
  };


  const seg = HERO_SEGMENTS[segment];
  const remaining = seg.qa.filter((item) => !asked.includes(item.q));
  const suggestions = remaining.length ? remaining.slice(0, 2) : [];

  return (
    <div className="hero-reveal-right hero-d3 w-full max-w-[460px] self-end ml-auto">
      <div className="flex h-[clamp(440px,56vh,520px)] flex-col rounded-[32px] bg-[#E8E5E2] p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#60A5FA] via-[#3B82F6] to-[#004DFF] shadow-md shadow-[#3B82F6]/30" />
            <div>
              <p className="font-semibold text-slate-900">Seu agente de IA</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-[#004DFF]" /> online agora
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Teste você mesmo</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {HERO_SEGMENTS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => selectSegment(i)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                i === segment
                  ? "border-[#004DFF]/40 bg-[#004DFF]/15 text-[#004DFF]"
                  : "border-slate-300/60 bg-white/60 text-slate-600 hover:bg-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.from === "user"
                    ? "rounded-tr-sm bg-[#004DFF] text-white"
                    : "rounded-tl-sm bg-[#004DFF]/20 text-slate-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[#004DFF]/20 px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item.q}
              type="button"
              disabled={typing}
              onClick={() => ask(item)}
              className="rounded-full border border-slate-300/60 bg-white/70 px-3 py-1.5 text-sm text-slate-600 transition hover:border-[#004DFF]/40 hover:bg-white hover:text-[#004DFF] disabled:opacity-50"
            >
              {item.q}
            </button>
          ))}
          {!suggestions.length && (
            <button
              type="button"
              onClick={() => selectSegment(segment)}
              className="rounded-full border border-slate-300/60 bg-white/70 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-white"
            >
              Recomeçar conversa
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendFree();
          }}
          className="mt-3 flex items-center gap-3 rounded-full bg-[#EEF1F6] px-4 py-3"
        >
          <button type="button" onClick={() => setDraft((d) => d + " ")} className="text-slate-500 transition hover:text-[#004DFF]" aria-label="Anexar">
            <Plus className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setDraft((d) => d + "😊")} className="text-slate-500 transition hover:text-[#004DFF]" aria-label="Emoji">
            <Smile className="h-5 w-5" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Digite uma mensagem"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          {draft.trim() ? (
            <button type="submit" disabled={typing} className="text-[#004DFF] disabled:opacity-50" aria-label="Enviar">
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <span className="text-slate-500" aria-hidden>
              <Mic className="h-5 w-5" />
            </span>
          )}
        </form>

      </div>
    </div>
  );
}


export default function Landing() {

  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [showCompareTable, setShowCompareTable] = useState(false);
  const [subscribing, setSubscribing] = useState<"start" | "business" | null>(null);
  const [liveLeads, setLiveLeads] = useState<{ name: string; segment: string; city: string }[]>([]);
  const [caseOffset, setCaseOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCaseOffset((prev) => (prev + 2) % cases.length);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Scroll to section when arriving with a hash (e.g. /homepage#planos)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const t = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, []);

  const visibleCases = [
    cases[caseOffset % cases.length],
    cases[(caseOffset + 1) % cases.length],
  ];



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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* NAV flutuante fixa */}
      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
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

      {/* HERO com nav flutuante sobre a foto */}
      <section className="relative flex min-h-screen flex-col overflow-hidden pt-24">
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
                e <span className="text-[#004DFF]">organiza seus</span>
              </span>
              <span className="block lg:whitespace-nowrap">
                <span className="text-[#004DFF]">clientes</span> no automático.
              </span>
            </h1>

            <p className="hero-reveal hero-d2 mt-6 max-w-xl text-xl leading-relaxed text-white/80">
              <span className="block lg:whitespace-nowrap">Enquanto você trabalha, ela responde cada cliente em</span>
              <span className="block lg:whitespace-nowrap">segundos, fecha a venda e organiza tudo no CRM. 2 dias</span>
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
                  Testar 2 dias grátis <ArrowRight className="ml-2 h-4 w-4" />
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
          <HeroChatCard />


          </div>
        </div>
      </section>

      {/* IDEAL PARA — carrossel */}
      <IdealParaMarquee />

      {/* POR TRÁS DE CADA WHATSAPP */}
      <MercadoSection />



      {/* PROSPECÇÃO */}
      <section id="recursos" className="mx-auto max-w-[1240px] px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content: Leads & Messaging */}
          <div className="space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Prospecção automática</span>
              <h2 className="font-space-grotesk text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                Encontre clientes
                <span className="block text-[#004DFF]">automaticamente.</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-md leading-relaxed">
                Pesquisa no Google Maps, extrai contatos e dispara o primeiro "oi" no WhatsApp.
                O sistema acha clientes enquanto você dorme.
              </p>
            </div>

            <div className="relative">
              {/* Decorative Glow */}
              <div className="absolute -inset-4 bg-[#004DFF]/5 blur-3xl rounded-full" />

              <div className="relative space-y-3">
                {(liveLeads.length >= 3
                  ? liveLeads.slice(0, 3)
                  : [
                      { name: "Clínica Sorriso+", segment: "Saúde bucal", city: "São Paulo" },
                      { name: "OdontoCenter Jardins", segment: "Dentista", city: "São Paulo" },
                      { name: "Dr. Renato Dental", segment: "Odontologia", city: "Curitiba" },
                    ]
                ).map((l, i) => {
                  const lead = {
                    ...l,
                    initial: l.name.trim().charAt(0).toUpperCase(),
                    highlight: i === 1,
                    offset:
                      i === 0
                        ? "-rotate-1 translate-x-2"
                        : i === 2
                          ? "rotate-1 translate-x-4 opacity-80"
                          : "",
                  };
                  return (
                  <div
                    key={`${lead.name}-${i}`}
                    className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transform transition hover:-translate-y-1 hover:shadow-md ${lead.offset}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${lead.highlight ? "bg-[#004DFF]/10 text-[#004DFF]" : "bg-slate-100 text-slate-900"}`}>
                        {lead.initial}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.segment} • {lead.city}</p>
                      </div>
                    </div>
                    <span className="bg-[#004DFF] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Novo</span>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Content: macOS window com mapa + leads */}
          <div className="order-1 lg:order-2">
            <ProspeccaoMapWindow onLeads={setLiveLeads} />
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
      <section id="ia" className="bg-[#F7F9FC] py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          {/* Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-none border-0 bg-transparent p-0 text-sm sm:text-sm md:text-sm font-semibold normal-case tracking-normal leading-none text-[#004DFF]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#004DFF]" />
              Tudo que você precisa
            </span>
            <h2 className="mt-5 font-space-grotesk text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#0B1220]">
              Uma IA que <span className="text-[#004DFF]">vende sozinha</span>.
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-[#0B1220]/60">
              Do primeiro "oi" até o fechamento. Tudo automático, tudo natural.
            </p>
          </div>

          {/* Bento grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Chat — grande */}
            <div className="group md:col-span-8 flex flex-col md:flex-row gap-8 rounded-3xl border border-white/60 bg-[#E6ECF7] p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#004DFF]/10 hover:border-[#004DFF]/20">
              <div className="md:w-[42%] shrink-0">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#004DFF] shadow-lg shadow-[#004DFF]/20">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-space-grotesk text-2xl font-bold text-[#0B1220]">Atende como um humano</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#0B1220]/70">
                  Responde texto e áudio, entende contexto, lembra do cliente. Conversa de verdade.
                </p>
              </div>

              {/* Mock chat */}
              <div className="flex-1 rounded-2xl bg-white p-5 shadow-xl shadow-[#0B1220]/5 transition-transform duration-500 group-hover:-translate-y-1">

                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B1220]/50">IA ativa</span>
                </div>
                <div className="space-y-3">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-[#F7F9FC] px-3.5 py-2.5 text-xs text-[#0B1220]">
                    Oi, vi o anúncio. Tem disponível?
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none bg-[#004DFF] px-3.5 py-2.5 text-xs text-white">
                    <div className="mb-0.5 text-[9px] font-semibold opacity-80">✦ IA Next Pro</div>
                    Tenho sim! Pra quando você precisa? Posso já reservar 😊
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-[#F7F9FC] px-3.5 py-2.5 text-xs text-[#0B1220]">
                    Pode ser amanhã 14h?
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none bg-[#004DFF] px-3.5 py-2.5 text-xs text-white">
                    <div className="mb-0.5 text-[9px] font-semibold opacity-80">✦ IA Next Pro</div>
                    Agendado! Te mando um lembrete 1h antes ✅
                  </div>
                </div>
              </div>
            </div>

            {/* Transcreve áudio */}
            <div className="md:col-span-4 flex flex-col rounded-3xl border border-white/60 bg-[#E6ECF7] p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#004DFF]/10 hover:border-[#004DFF]/20">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#004DFF] shadow-lg shadow-[#004DFF]/20">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-space-grotesk text-xl font-bold text-[#0B1220]">Transcreve áudio</h3>
              <p className="mt-2 text-sm text-[#0B1220]/70">
                Cliente mandou áudio? A IA escuta, entende e responde na hora.
              </p>
              <div className="mt-auto flex items-center gap-3 pt-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#004DFF] text-white">
                  <Play className="ml-0.5 h-4 w-4" />
                </div>
                <div className="flex h-6 flex-1 items-center gap-0.5">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full bg-[#004DFF]/60"
                      style={{ height: `${25 + Math.abs(Math.sin(i * 0.9)) * 75}%` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-[#0B1220]/40">0:12</span>
              </div>
            </div>

            {/* Recupera leads frios */}
            <div className="md:col-span-4 flex flex-col justify-between rounded-3xl border border-white/60 bg-[#E6ECF7] p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#004DFF]/10 hover:border-[#004DFF]/20">
              <div>
                <h3 className="font-space-grotesk text-xl font-bold text-[#0B1220]">Recupera leads frios</h3>
                <p className="mt-2 text-sm text-[#0B1220]/70">
                  Follow-up automático até o cliente responder.
                </p>
              </div>
              <div className="mt-8 flex items-end gap-1.5">
                <div className="h-8 w-full rounded-t-lg bg-white/60" />
                <div className="h-16 w-full rounded-t-lg bg-white/60" />
                <div className="h-12 w-full rounded-t-lg bg-white/60" />
                <div className="h-24 w-full rounded-t-lg bg-[#004DFF]" />
              </div>
            </div>

            {/* Agenda automático */}
            <div className="relative md:col-span-4 flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0B1220] p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#004DFF]/25 hover:ring-1 hover:ring-[#004DFF]/30">
              <div className="relative z-10">
                <Calendar className="mb-5 h-6 w-6 text-[#004DFF]" />
                <h3 className="font-space-grotesk text-xl font-bold text-white">Agenda automático</h3>
                <p className="mt-2 text-sm text-white/60">
                  Marca reuniões e visitas sem você abrir a agenda.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#004DFF]/25">
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#004DFF] border-t-transparent" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">Sinc</span>
                </div>
              </div>
            </div>

            {/* Aviso de lead quente */}
            <div className="md:col-span-4 flex flex-col rounded-3xl border border-white/60 bg-[#E6ECF7] p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#004DFF]/10 hover:border-[#004DFF]/20">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#004DFF] shadow-lg shadow-[#004DFF]/20">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#004DFF]/60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#004DFF]" />
                </span>
              </div>
              <h3 className="font-space-grotesk text-xl font-bold text-[#0B1220]">Aviso de lead quente</h3>
              <p className="mt-2 text-sm text-[#0B1220]/70">
                Quando o cliente tá pronto, você recebe no WhatsApp.
              </p>
              <span className="mt-auto pt-6 text-xs font-bold uppercase tracking-widest text-[#004DFF]">
                Alerta em tempo real
              </span>

            </div>

            {/* Anti-bloqueio */}
            <div className="md:col-span-12 flex flex-col items-center justify-between gap-6 rounded-3xl border border-[#E6ECF7] bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#004DFF]/10 hover:border-[#004DFF]/20 md:flex-row">
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#004DFF]/10">
                  <ShieldCheck className="h-8 w-8 text-[#004DFF]" />
                </div>
                <div>
                  <h3 className="font-space-grotesk text-xl font-bold text-[#0B1220]">Anti-bloqueio</h3>
                  <p className="mt-1 max-w-xl text-sm text-[#0B1220]/70">
                    Disparos seguros, ritmo natural, simulação humana — sua conta do WhatsApp protegida.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <div className="rounded-lg border border-[#E6ECF7] bg-[#F7F9FC] px-4 py-2 text-xs font-bold text-[#0B1220]">
                  Proteção 24/7
                </div>
                <div className="rounded-lg border border-[#E6ECF7] bg-[#F7F9FC] px-4 py-2 text-xs font-bold text-emerald-600">
                  Seguro
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* DA PRIMEIRA MENSAGEM AO PAGAMENTO */}
      <FluxoCompletoSection />

      {/* PLANOS */}
      <section id="planos" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div>
            {/* Header centralizado */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold normal-case tracking-normal leading-none text-[#004DFF]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#004DFF]" />
                Planos para cada fase
              </span>
              <h2 className="mt-4 font-space-grotesk text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#0B1220]">
                Escolha o plano{" "}
                <span className="text-[#004DFF]">ideal pra você</span>
              </h2>
              <p className="mt-4 text-base text-[#0B1220]/60 max-w-2xl mx-auto">
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

            {/* Cards */}
            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

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
                  className={`relative min-w-0 w-full overflow-hidden rounded-[28px] bg-slate-50 p-5 sm:p-6 text-left transition-all duration-300 hover:-translate-y-1 ${
                    p.featured
                      ? "ring-1 ring-[#004DFF] shadow-[0_20px_60px_-25px_rgba(0,77,255,0.45)]"
                      : "border border-slate-200 hover:border-[#004DFF]/30 hover:shadow-lg hover:shadow-[#004DFF]/5"
                  }`}
                >
                  {p.featured && (
                    <div className="absolute right-4 top-4 rounded-full bg-[#004DFF] px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      Popular
                    </div>
                  )}

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

                  <div className="my-5 h-px bg-slate-200" />

                  <div className="space-y-3">
                    <div className="rounded-2xl px-4 py-3.5 text-base text-slate-500" style={{ backgroundColor: "rgba(0,77,255,0.06)", border: "1px solid rgba(0,77,255,0.12)" }}>
                      {p.highlights[0].pre}
                      <span className="font-bold text-slate-900">{p.highlights[0].strong}</span>
                      {p.highlights[0].post}
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3.5 text-base text-slate-500">
                      <span className="font-bold text-slate-900">{p.highlights[1].strong}</span>
                      {p.highlights[1].post}
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedTier(expandedTier === p.tier ? null : p.tier)}
                    className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-semibold transition hover:opacity-80"
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

                  <div className="mt-4 flex flex-col items-center">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <ShieldCheck className="h-4 w-4" style={{ color: "#004DFF" }} />
                      Garantia de 30 dias
                    </div>
                    <div className="text-xs text-slate-500">ou seu dinheiro de volta</div>
                  </div>

                  <div className="mt-5 min-h-[52px] border-t border-slate-200 pt-4">
                    <RotatingChips tier={p.tier} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BOTÃO COMPARAR PLANOS */}
          <div className="mt-16 flex justify-center">
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




      {/* INTEGRAÇÕES */}
      <section className="relative overflow-hidden bg-white -mt-8 pt-0 pb-12 border-b border-slate-200/50">
        <div className="mx-auto max-w-[1240px] px-6 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Integrações</span>
          
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
            {[
              { src: iconGoogle.url, alt: "Google" },
              { src: iconWhatsapp.url, alt: "WhatsApp" },
              { src: iconInstagram.url, alt: "Instagram" },
              { src: iconTiktok.url, alt: "TikTok" },
              { src: iconCalendar.url, alt: "Google Calendar" },
              { src: iconOpenai.url, alt: "OpenAI" },
              { src: iconMeta.url, alt: "Meta" },
            ].map((icon, i) => (
              <img
                key={icon.alt}
                src={icon.src}
                alt={icon.alt}
                className="icon-hop h-7 w-7 md:h-8 md:w-8 object-contain"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

        </div>

        {/* Processo animado (Cadastro → Área → Canal → Teste → Pronto) */}
        <OnboardingSteps />

      </section>

      {/* VOZ CLONADA */}
      <section className="relative overflow-hidden bg-[#F5EFE6] py-28">
        {/* textura de fundo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #E8DFD2 0%, transparent 45%), radial-gradient(circle at 85% 75%, #E8DFD2 0%, transparent 50%)",
          }}
        />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-16 px-6 md:grid-cols-[1.05fr_1fr]">
          {/* Coluna esquerda */}
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#004DFF]">
              <span className="h-2 w-2 rounded-full bg-[#004DFF]" />
              Tecnologia exclusiva
            </span>
            <h2 className="mt-6 font-space-grotesk text-5xl md:text-[64px] font-bold leading-[0.98] tracking-tight text-[#0B1220]">
              Sua <span className="relative inline-block" style={{ color: "#004DFF" }}>
                voz clonada
                <span className="absolute -bottom-1 left-0 h-[6px] w-full rounded-full" style={{ backgroundColor: "#004DFF", opacity: 0.16 }} />
              </span>,<br />
              respondendo por você.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#0B1220]/65">
              Grave 60 segundos da sua voz. A IA clona e envia áudios automáticos no WhatsApp — tão naturais que o cliente jura que é você.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Áudios ultra naturais em português", "Atendimento humanizado em escala", "Mais retenção, mais conversão", "Cliente sente que está falando com gente"].map((i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-[#0B1220]/8 bg-white/60 px-4 py-3 text-[15px] text-[#0B1220]/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#004DFF]/30 hover:bg-white"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#004DFF" }}>
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {i}
                </li>
              ))}
            </ul>

            <Link to="/auth">
              <Button className="btn-press mt-10 rounded-full px-8 py-6 text-base text-white shadow-[0_14px_34px_-12px_rgba(0,77,255,0.7)]" style={{ backgroundColor: "#004DFF" }}>
                Clonar minha voz <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Coluna direita — player como objeto físico */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[42px] bg-[#E8DFD2]/70 blur-[2px]" />
            <div className="relative rounded-[32px] border border-white/70 bg-white p-8 shadow-[0_36px_70px_-30px_rgba(11,18,32,0.35)] transition-transform duration-500 hover:-translate-y-1">
              <div className="mb-8 flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "#004DFF" }}>
                  <Mic className="h-6 w-6 text-white" />
                  <span className="absolute inset-0 rounded-2xl ring-4 ring-[#004DFF]/15" />
                </div>
                <div>
                  <div className="font-space-grotesk font-bold text-[#0B1220]">Sua voz · IA Next Pro</div>
                  <div className="text-xs text-[#0B1220]/50">Clonada com 60s de áudio</div>
                </div>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#F5EFE6] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0B1220]/60">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: "#004DFF" }} />
                  ao vivo
                </span>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-[#F5EFE6]/70 p-4">
                <button className="h-14 w-14 flex-shrink-0 rounded-full shadow-[0_10px_24px_-10px_rgba(0,77,255,0.8)] transition-transform hover:scale-105 flex items-center justify-center" style={{ backgroundColor: "#004DFF" }}>
                  <Play className="ml-0.5 h-5 w-5 text-white" fill="currentColor" />
                </button>
                <div className="flex h-12 flex-1 items-center gap-[3px]">
                  {[...Array(48)].map((_, i) => (
                    <div
                      key={i}
                      className="voz-bar flex-1 rounded-full"
                      style={{
                        height: `${25 + Math.abs(Math.sin(i * 0.7)) * 70 + Math.abs(Math.cos(i * 1.3)) * 20}%`,
                        backgroundColor: "#004DFF",
                        opacity: 0.75,
                        animationDelay: `${(i % 12) * 0.09}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="flex-shrink-0 font-space-grotesk text-xs font-bold text-[#0B1220]/50">0:18</span>
              </div>
              <p className="mt-4 text-center text-xs text-[#0B1220]/45">Clique no play e ouça uma amostra agora.</p>

              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[#0B1220]/8 pt-6">
                {[
                  { v: "60s", l: "pra clonar" },
                  { v: "100%", l: "natural" },
                  { v: "pt-BR", l: "nativo" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-[#F5EFE6]/60 py-3 text-center transition-colors hover:bg-[#E8DFD2]">
                    <div className="font-space-grotesk text-2xl font-bold" style={{ color: "#004DFF" }}>{s.v}</div>
                    <div className="mt-0.5 text-[11px] text-[#0B1220]/50">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* PAGAMENTOS */}
      <section id="pagamentos" className="bg-[#F7F9FC] py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          {/* Header */}
          <div className="mb-16 text-center">
            <span className="inline-flex items-center gap-2 font-space-grotesk text-sm font-semibold text-[#004DFF]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#004DFF]" />
              Automação Inteligente
            </span>
            <h2 className="mt-5 font-space-grotesk text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#0B1220]">
              Recuperação <span className="text-[#004DFF]">financeira</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#0B1220]/60">
              Reduza a inadimplência com réguas de cobrança automatizadas e múltiplos métodos de pagamento.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* WhatsApp mockup */}
            <div className="group relative min-h-[500px] overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-[0_20px_50px_-20px_rgba(0,77,255,0.12)] md:col-span-7">
              <div className="absolute inset-0 bg-gradient-to-br from-[#E6ECF7]/50 to-transparent" />
              <div className="relative flex h-full flex-col p-8">
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a8.962 8.962 0 01-4.419-1.176l-.317-.188-3.272.858.873-3.19-.205-.326C4.161 13.91 3.4 12.095 3.4 10.22 3.4 5.355 7.355 1.4 12.22 1.4c4.865 0 8.82 3.955 8.82 8.82 0 4.865-3.955 8.82-8.82 8.82M12.22 0C6.583 0 2 4.583 2 10.22c0 1.802.47 3.56 1.363 5.148L2 22l6.828-1.792A10.183 10.183 0 0012.22 21.6c5.637 0 10.22-4.583 10.22-10.22C22.44 4.583 17.857 0 12.22 0z"/></svg>
                  </div>
                  <div>
                    <h4 className="font-space-grotesk font-bold text-[#0B1220]">WhatsApp Business</h4>
                    <p className="text-xs text-[#0B1220]/50">Cobrança ativa</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#F7F9FC] p-4 shadow-sm">
                    <p className="text-sm text-[#0B1220]/80">
                      Olá, <strong>Mariana</strong>! Identificamos que sua fatura de R$ 450,00 vence hoje. Gostaria do código Pix para pagamento?
                    </p>
                    <span className="mt-1 block text-[10px] text-[#0B1220]/40">09:41</span>
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none bg-[#004DFF] p-4 shadow-lg">
                    <p className="text-sm text-white">Sim, por favor. Pode enviar?</p>
                    <span className="mt-1 block text-right text-[10px] text-blue-200">09:42</span>
                  </div>
                  <div className="max-w-[85%] overflow-hidden rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 shadow-xl">
                    <div className="absolute left-0 top-0 h-full w-1 bg-[#004DFF]" />
                    <p className="mb-3 text-sm font-medium text-[#0B1220]">Aqui está o seu código Pix Copia e Cola:</p>
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-500">
                      00020101021226840014br.gov.bcb.pix25620021nextpro.crm.recup...
                    </div>
                    <button className="mt-3 w-full rounded-lg bg-[#004DFF] py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-blue-700">
                      Copiar Código
                    </button>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-8">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#E6ECF7] text-[10px] font-bold text-[#004DFF]">
                      +12k
                    </div>
                  </div>
                  <p className="text-xs font-medium text-[#0B1220]/50">+85% de taxa de conversão no WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="grid grid-cols-1 gap-6 md:col-span-5">
              {/* Timeline */}
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white p-8 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)]">
                <h4 className="mb-6 font-space-grotesk text-lg font-bold text-[#0B1220]">Jornada de Recuperação</h4>
                <div className="relative space-y-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />
                  <div className="flex items-start gap-4 relative">
                    <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#E6ECF7] shadow-sm" />
                    <div>
                      <p className="text-sm font-bold text-[#0B1220]">Lembrete Preventivo</p>
                      <p className="text-xs text-[#0B1220]/50 italic">Enviado 3 dias antes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 relative">
                    <div className="z-10 flex h-6 w-6 shrink-0 animate-pulse items-center justify-center rounded-full border-4 border-white bg-[#004DFF] shadow-[0_0_10px_rgba(0,77,255,0.4)]" />
                    <div>
                      <p className="text-sm font-bold text-[#0B1220]">Dia do Vencimento</p>
                      <p className="text-xs font-medium text-[#004DFF]">Pix gerado automaticamente</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 relative">
                    <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-white bg-emerald-500 shadow-sm">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-600">Pagamento Confirmado</p>
                      <p className="text-xs text-[#0B1220]/50">Recuperação concluída em 2h</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment methods */}
              <div className="relative overflow-hidden rounded-[2rem] bg-[#004DFF] p-8 text-white">
                <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <h4 className="mb-6 font-space-grotesk text-lg font-bold">Métodos integrados</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "PIX", icon: <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 22l4-4 4 4m-8-20l4 4 4-4m-8 8l4 4 4-4" /></svg> },
                    { label: "CARD", icon: <CreditCard className="h-8 w-8" /> },
                    { label: "BOLETO", icon: <Receipt className="h-8 w-8" /> },
                  ].map((m) => (
                    <div key={m.label} className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md">
                      {m.icon}
                      <span className="mt-2 text-[10px] font-bold tracking-widest">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom features */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Zap className="h-6 w-6" />, title: "Cobrança no WhatsApp", sub: "Envio automático com link de pagamento" },
              { icon: <ShieldCheck className="h-6 w-6 text-[#22C55E]" />, title: "PIX + Boleto", sub: "Links de pagamento direto no chat" },
              { icon: <Clock className="h-6 w-6 text-[#FACC15]" />, title: "Retentativa", sub: "Cobrança recorrente" },
              { icon: <BarChart3 className="h-6 w-6 text-[#7C3AED]" />, title: "Dashboard", sub: "Métricas em tempo real" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4 rounded-3xl border border-slate-200/60 bg-white p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6ECF7] text-[#004DFF]">
                  {f.icon}
                </div>
                <div>
                  <p className="font-space-grotesk text-sm font-bold text-[#0B1220]">{f.title}</p>
                  <p className="text-xs text-[#0B1220]/50">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POTENCIALIZE AO MÁXIMO */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-[#22c55e] rounded-full" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0B1220] font-space-grotesk tracking-tight">
              Potencialize ao máximo
            </h2>
            <p className="mt-4 text-slate-500 text-lg">
              Diversas funcionalidades para o seu negócio crescer muito.
            </p>
          </div>

          <div className="relative overflow-hidden py-4">
            <div className="flex animate-marquee-slower whitespace-nowrap group w-max">
              {[
                { icon: Megaphone, label: "Webhooks" },
                { icon: Wrench, label: "API" },
                { icon: Bot, label: "Chatbot" },
                { icon: Zap, label: "Campanhas" },
                { icon: Activity, label: "Automação" },
                { icon: Calendar, label: "Agendamentos" },
                { icon: Users, label: "Vários atendentes" },
                { icon: CreditCard, label: "Pagamentos" },
                { icon: MessageSquare, label: "CRM" },
                { icon: Repeat, label: "Recorrência" },
                { icon: MapPin, label: "Extração Leads" },
                { icon: Volume2, label: "Áudio IA" },
                { icon: Target, label: "Prospecção" },
                { icon: ShieldCheck, label: "Segurança" },
                { icon: Headphones, label: "Atendimento" },
                { icon: BarChart3, label: "Métricas" },
                { icon: Sparkles, label: "Aurora IA" },
                { icon: Globe, label: "Multicanais" }
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 px-6 py-4 mx-2 rounded-xl bg-[#f8fafc] border border-slate-200/60 whitespace-nowrap transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.label === 'API' ? 'bg-[#15803d]/10 text-[#15803d]' : 'bg-white text-slate-600 shadow-sm border border-slate-100'}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-slate-700">{item.label}</span>
                </div>
              ))}
              {/* Duplicado para loop infinito */}
              {[
                { icon: Megaphone, label: "Webhooks" },
                { icon: Wrench, label: "API" },
                { icon: Bot, label: "Chatbot" },
                { icon: Zap, label: "Campanhas" },
                { icon: Activity, label: "Automação" },
                { icon: Calendar, label: "Agendamentos" },
                { icon: Users, label: "Vários atendentes" },
                { icon: CreditCard, label: "Pagamentos" },
                { icon: MessageSquare, label: "CRM" },
                { icon: Repeat, label: "Recorrência" },
                { icon: MapPin, label: "Extração Leads" },
                { icon: Volume2, label: "Áudio IA" },
                { icon: Target, label: "Prospecção" },
                { icon: ShieldCheck, label: "Segurança" },
                { icon: Headphones, label: "Atendimento" },
                { icon: BarChart3, label: "Métricas" },
                { icon: Sparkles, label: "Aurora IA" },
                { icon: Globe, label: "Multicanais" }
              ].map((item, i) => (
                <div 
                  key={`clone-${i}`}
                  className="flex items-center gap-3 px-6 py-4 mx-2 rounded-xl bg-[#f8fafc] border border-slate-200/60 whitespace-nowrap transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.label === 'API' ? 'bg-[#15803d]/10 text-[#15803d]' : 'bg-white text-slate-600 shadow-sm border border-slate-100'}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>
            {/* Sombras nas bordas para suavizar a entrada/saída */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
          </div>
        </div>
      </section>

      {/* SEGMENTOS */}
      <section id="segmentos" className="relative overflow-hidden bg-white py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(0,77,255,0.09) 0%, transparent 55%), linear-gradient(to bottom, rgba(241,245,249,0.9), transparent 40%)",
          }}
        />
        <div className="relative mx-auto grid max-w-[1240px] items-start gap-14 px-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Coluna esquerda — texto */}
          <div className="lg:sticky lg:top-28">
            <span className="inline-flex items-center gap-2 font-space-grotesk text-sm font-semibold text-[#004DFF]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#004DFF]" />
              Pra qualquer negócio
            </span>
            <h2 className="mt-6 font-space-grotesk text-4xl md:text-[56px] font-bold leading-[1] tracking-tight text-[#0B1220]">
              Funciona pro{" "}
              <span className="relative inline-block" style={{ color: "#004DFF" }}>
                seu segmento.
                <span
                  className="absolute -bottom-1 left-0 h-[6px] w-full rounded-full"
                  style={{ backgroundColor: "#004DFF", opacity: 0.16 }}
                />
              </span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-500">
              A IA se adapta ao seu nicho. Prospecção e atendimento ajustados ao seu mercado.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5">
                <div className="font-space-grotesk text-2xl font-bold text-[#0B1220]">+40</div>
                <div className="text-[12px] text-slate-500">nichos atendidos</div>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5">
                <div className="font-space-grotesk text-2xl font-bold" style={{ color: "#004DFF" }}>
                  5 min
                </div>
                <div className="text-[12px] text-slate-500">pra treinar a IA</div>
              </div>
            </div>

            <p className="mt-8 max-w-sm text-[13px] leading-relaxed text-slate-400">
              Não achou o seu? A IA aprende qualquer nicho em minutos.
            </p>
          </div>

          {/* Coluna direita — grid de segmentos */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {segments.map((s) => (
              <div
                key={s.label}
                className="group relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white p-5 transition-all duration-500 hover:-translate-y-2 hover:border-[#004DFF]/40 hover:shadow-none hover:scale-[1.02]"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 100% 0%, rgba(0,77,255,0.10) 0%, transparent 60%)",
                  }}
                />
                <div className="relative flex h-full flex-col">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#004DFF]/15 bg-[#004DFF]/[0.06] transition-colors duration-300 group-hover:bg-[#004DFF] group-hover:border-[#004DFF]">
                    <s.icon
                      className="h-5 w-5 text-[#004DFF] transition-colors duration-300 group-hover:text-white"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="mt-5 font-space-grotesk text-[17px] font-bold tracking-tight text-[#0B1220]">
                    {s.label}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>


      {/* CENTRAL COMPLETA */}
      <section className="bg-[#f4f1ec] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 font-space-grotesk text-sm font-semibold text-[#004DFF]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#004DFF]" />
              Tudo em um único painel
            </span>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold font-space-grotesk">
              Sua central comercial <span style={{ color: "#004DFF" }}>completa.</span>
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Prospecção, IA, CRM, cobrança e campanhas — organizados, sem complicação.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Target,
                title: "Prospecção",
                items: [
                  { i: MapPin, l: "Google Maps", bg: "bg-blue-100", color: "text-[#004DFF]" },
                  { i: Instagram, l: "Instagram", bg: "bg-pink-100", color: "text-pink-600" },
                  { i: FileText, l: "Base CNPJ", bg: "bg-slate-100", color: "text-slate-600" },
                  { i: UsersRound, l: "Grupos WhatsApp", bg: "bg-green-100", color: "text-green-600" },
                ],
              },
              {
                icon: Bot,
                title: "IA & Automação",
                items: [
                  { i: Headphones, l: "Atendimento IA", bg: "bg-indigo-100", color: "text-indigo-600" },
                  { i: Volume2, l: "Áudio IA", bg: "bg-purple-100", color: "text-purple-600" },
                  { i: Mic, l: "Clonagem de voz", bg: "bg-amber-100", color: "text-amber-600" },
                  { i: Repeat, l: "Follow-up automático", bg: "bg-rose-100", color: "text-rose-600" },
                ],
              },
              {
                icon: Wallet,
                title: "Comercial & Cobrança",
                items: [
                  { i: TrendingUp, l: "CRM / Funil", bg: "bg-sky-100", color: "text-sky-600" },
                  { i: Receipt, l: "Cobranças automáticas", bg: "bg-orange-100", color: "text-orange-600" },
                  { i: CreditCard, l: "PIX e boleto", bg: "bg-emerald-100", color: "text-emerald-600" },
                  { i: AlertCircle, l: "Recuperação de inadimplentes", bg: "bg-violet-100", color: "text-violet-600" },
                ],
              },
              {
                icon: Megaphone,
                title: "Comunicação",
                items: [
                  { i: Send, l: "Campanhas em massa", bg: "bg-blue-100", color: "text-[#004DFF]" },
                  { i: MessageSquare, l: "Múltiplos WhatsApps", bg: "bg-green-100", color: "text-green-600" },
                  { i: ListChecks, l: "Respostas rápidas", bg: "bg-indigo-100", color: "text-indigo-600" },
                  { i: Ban, l: "Listas e blacklist", bg: "bg-slate-100", color: "text-slate-600" },
                ],
              },
            ].map((group) => (
              <div
                key={group.title}
                className="group relative bg-white border border-slate-200 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,77,255,0.08)] transition-all duration-500 hover:-translate-y-1"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-[#004DFF] flex items-center justify-center text-white shadow-lg shadow-[#004DFF]/20">
                    <group.icon className="h-6 w-6" />
                  </div>
                  <div className="font-semibold text-2xl text-[#0F172A]">{group.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {group.items.map((it) => (
                    <div
                      key={it.l}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 transition-colors group-hover:bg-white"
                    >
                      <div className={`h-8 w-8 rounded-lg ${it.bg} flex items-center justify-center flex-shrink-0 ${it.color}`}>
                        <it.i className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate">{it.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION PARTNERS & FEATURES (MOCKUP) */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Top Bar: Partners */}
          <div className="mx-auto mb-10 max-w-4xl rounded-full bg-[#F3F4F6] px-8 py-3 shadow-sm border border-slate-100 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <img src={iconMeta.url} alt="Meta" className="h-5 w-auto" />
              <span className="text-sm font-medium text-slate-900">Meta Tech Partner</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Powered by WhatsApp Business API</span>
          </div>

          {/* Main Mockup Container */}
          <div className="relative rounded-[40px] bg-[#F1F4F9] p-8 md:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
              
              {/* Left Column: Branding & CTA */}
              <div className="lg:col-span-3 pt-4">
                <div className="mb-6 flex items-center gap-2">
                  <img src={logoAurora.url} alt="Logo" className="h-10 w-10 grayscale opacity-80" />
                </div>
                
                <span className="inline-block rounded-full bg-[#D1EACF] px-3 py-1 text-[10px] font-bold text-[#2A5C2D] uppercase tracking-wider mb-6">
                  Funcionalidades
                </span>
                
                <h3 className="font-space-grotesk text-3xl font-bold leading-tight text-[#1E293B] mb-6">
                  Centralize e Potencialize Seu Atendimento no WhatsApp
                </h3>
                
                <p className="text-base text-slate-500 mb-12">
                  Transforme a comunicação do seu negócio.
                </p>
                
                <div className="flex items-center gap-3">
                  <Link to="/auth">
                    <Button className="h-14 rounded-full bg-[#83D152] hover:bg-[#72b846] px-8 text-base font-bold text-slate-900 shadow-lg shadow-[#83D152]/20">
                      Assinar Agora
                    </Button>
                  </Link>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0D2418] text-white">
                    <ArrowRight className="h-6 w-6 rotate-[-45deg]" />
                  </div>
                </div>
              </div>

              {/* Middle Column: Dashboard Mockup */}
              <div className="lg:col-span-4 rounded-3xl bg-white p-8 shadow-xl border border-white/60 group hover:shadow-2xl transition-all duration-700 relative overflow-hidden">
                {/* Floating particle effects for Dashboard */}
                <div className="absolute top-0 right-0 h-32 w-32 bg-[#004DFF]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#004DFF]/10 transition-colors" />
                
                <div className="relative z-10">
                  <div className="mb-6">
                    <h4 className="font-space-grotesk text-xl font-bold text-slate-900 group-hover:text-[#004DFF] transition-colors">Dashboard Intuitivo</h4>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                      Tenha uma visão completa dos seus atendimentos, contatos e desempenho da equipe em tempo real.
                    </p>
                  </div>
                  
                  <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 group-hover:border-[#004DFF]/20 transition-colors">
                    <div className="flex h-64 w-full bg-[#F8FAFC]">
                      {/* Fake Sidebar */}
                      <div className="w-16 border-r border-slate-100 p-2 space-y-2">
                        <div className="h-2 w-full rounded-full bg-slate-200 group-hover:bg-[#004DFF]/10 transition-colors" />
                        <div className="h-2 w-4/5 rounded-full bg-slate-200" />
                        <div className="h-2 w-3/4 rounded-full bg-slate-200" />
                      </div>
                      {/* Fake Content */}
                      <div className="flex-1 p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="h-8 w-24 rounded-lg bg-white border border-slate-100 group-hover:shadow-sm transition-all" />
                          <div className="h-8 w-16 rounded-lg bg-white border border-slate-100 group-hover:shadow-sm transition-all" />
                        </div>
                        <div className="h-24 w-full rounded-xl bg-white border border-slate-100 p-4 relative overflow-hidden group-hover:shadow-md transition-all">
                          <div className="h-full w-full bg-emerald-50/50 rounded-lg flex items-end px-2 gap-1 pb-2">
                            {[40, 70, 45, 90, 60, 30].map((h, i) => (
                              <div 
                                key={i} 
                                className="flex-1 bg-emerald-400/30 rounded-t-sm group-hover:bg-[#004DFF]/30 transition-all duration-700" 
                                style={{ 
                                  height: `${h}%`,
                                  transitionDelay: `${i * 50}ms`
                                }} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Feature Cards Grid */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4 lg:-mr-20 xl:-mr-32 relative z-10">
                {[
                  { icon: Users, title: "Vários atendentes", desc: "Cadastre toda a sua equipe no painel, dividindo por departamentos.", delay: 0 },
                  { icon: Calendar, title: "Agendamentos", desc: "Nosso recurso de agendamento, tem o poder de enviar mensagens no momento certo", delay: 100 },
                  { icon: MessageSquare, title: "Respostas rápidas", desc: "Com o auto resposta, basta digitar \"/\" para acessar a sua lista de mensagens rápidas", delay: 200 },
                  { icon: Send, title: "Envios em massa", desc: "Envie mensagens para todos os seus contatos com o módulo campanha", delay: 300 },
                  { icon: Bot, title: "Chat interno", desc: "Seus atendentes podem se comunicar internamente entre eles e outros membros do time", delay: 400 },
                  { icon: ListChecks, title: "Todas as Funcionalidades", desc: "Funcionalidades que elevarão o seu negócio a um novo patamar.", delay: 500 },
                ].map((feature, idx) => (
                  <div 
                    key={idx} 
                    className="group rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:border-[#004DFF]/30 transition-all duration-500 flex flex-col min-h-[160px] animate-fade-in-up relative overflow-hidden"
                    style={{ animationDelay: `${feature.delay}ms` }}
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#004DFF]/0 via-[#004DFF]/5 to-[#004DFF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
                    
                    <div className="relative z-10">
                      <div className="mb-4 text-[#1E3A2F] group-hover:text-[#004DFF] transition-colors duration-300 group-hover:scale-110 origin-left transform duration-500">
                        <feature.icon className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <h5 className="font-space-grotesk text-[17px] font-bold text-[#1E3A2F] group-hover:text-[#0B1220] mb-3 leading-tight transition-colors duration-300">
                        {feature.title}
                      </h5>
                      <p className="text-[13px] text-slate-500 leading-relaxed font-medium group-hover:text-slate-600 transition-colors duration-300">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CRM KANBAN SECTION */}
      <section className="bg-white py-24 overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
              <span className="text-[#8B5CF6] font-bold tracking-widest text-xs uppercase mb-4 block font-space-grotesk">
                CRM NEXT PRO
              </span>
              <h2 className="text-4xl md:text-[56px] font-bold text-[#0B1220] font-space-grotesk leading-[1.1] tracking-tight mb-8">
                Seu funil vivo, clicável e organizado.
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed mb-10">
                Veja leads chegando, conversas mudando de etapa e oportunidades avançando em tempo real. Clique em qualquer card para mover manualmente, como no CRM da Vunex.
              </p>
              
              <div className="space-y-4">
                {[
                  "Distribua conversas por etapa",
                  "Atribua responsáveis e etiquetas",
                  "Automatize movimentações pelo fluxo"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#8B5CF6] text-[#8B5CF6]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <span className="text-slate-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content: Kanban Mockup */}
            <div className="relative">
              {/* Background Glow */}
              <div className="absolute -inset-10 bg-[#8B5CF6]/5 rounded-[40px] blur-3xl" />
              
              <KanbanMockup />
            </div>
          </div>
        </div>
      </section>


      {/* VELOCIDADE DE RESPOSTA (NOVO) */}
      <section className="bg-white py-24 overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <div className="mb-6 flex justify-center">
            <span className="rounded-full bg-slate-50 px-4 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
              Dados: MIT / InsideSales Research
            </span>
          </div>
          
          <h2 className="font-space-grotesk text-4xl md:text-[56px] font-bold leading-[1.1] tracking-tight text-[#0B1220]">
            Enquanto você não responde,<br />
            <span className="text-[#F43F5E]">seu concorrente fecha a venda</span>
          </h2>
          
          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-500 leading-relaxed">
            O lead mandou mensagem às 22h. Sua equipe só viu às 8h da manhã. Resultado? Ele já comprou do concorrente que respondeu em 2 minutos. Não é falta de interesse do lead, é falta de velocidade sua.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[32px] border border-[#FEE2E2] bg-[#FFFBFB] p-8 text-left transition-transform hover:-translate-y-1">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <Clock className="h-5 w-5 text-[#F43F5E]" />
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600">
                O lead mandou mensagem às 22h. Ninguém respondeu. Às 8h ele já tinha fechado com o concorrente.
              </p>
            </div>
            
            <div className="rounded-[32px] border border-[#FEE2E2] bg-[#FFFBFB] p-8 text-left transition-transform hover:-translate-y-1">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <Zap className="h-5 w-5 text-[#F43F5E]" />
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600">
                Você pagou R$ 12 no clique do anúncio. O lead esperou 4 minutos. Desistiu. Dinheiro jogado fora.
              </p>
            </div>

            <div className="rounded-[32px] border border-[#FEE2E2] bg-[#FFFBFB] p-8 text-left transition-transform hover:-translate-y-1">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <Smile className="h-5 w-5 text-[#F43F5E]" />
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600">
                "Alguém pode me atender?", a terceira mensagem sem resposta. Ele nunca mais volta.
              </p>
            </div>
          </div>

          <div className="mt-20">
            <p className="text-sm font-semibold text-slate-400">Não é achismo. <span className="text-slate-900">Os números confirmam:</span></p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-[32px] border border-slate-100 bg-white p-10 shadow-sm transition-all hover:border-[#004DFF]/20 hover:shadow-xl hover:shadow-[#004DFF]/5">
                <div className="mb-4 flex justify-center">
                  <Clock className="h-6 w-6 text-slate-400" />
                </div>
                <div className="font-space-grotesk text-5xl font-bold text-[#F43F5E]">78%</div>
                <p className="mt-4 text-sm font-medium text-slate-500">dos leads são perdidos por demora no atendimento</p>
              </div>

              <div className="rounded-[32px] border border-emerald-100 bg-[#F0FDF4] p-10 shadow-sm transition-all hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5">
                <div className="mb-4 flex justify-center">
                  <Zap className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="font-space-grotesk text-5xl font-bold text-[#10B981]">391%</div>
                <p className="mt-4 text-sm font-medium text-slate-500">mais conversão ao responder em menos de 1 min</p>
              </div>

              <div className="rounded-[32px] border border-slate-100 bg-white p-10 shadow-sm transition-all hover:border-[#004DFF]/20 hover:shadow-xl hover:shadow-[#004DFF]/5">
                <div className="mb-4 flex justify-center">
                  <TrendingUp className="h-6 w-6 text-slate-400" />
                </div>
                <div className="font-space-grotesk text-5xl font-bold text-slate-900">10×</div>
                <p className="mt-4 text-sm font-medium text-slate-500">menor chance de contato após 5 minutos sem resposta</p>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras */}
          <div className="mt-24 mx-auto max-w-4xl">
            <p className="mb-8 text-xs font-bold uppercase tracking-widest text-slate-400">Conversão por tempo de resposta</p>
            <div className="space-y-4">
              {[
                { time: "< 1 min", value: "391%", width: "100%", active: true },
                { time: "1,5 min", value: "160%", width: "41%", active: false },
                { time: "5,30 min", value: "100%", width: "25%", active: false },
                { time: "30+ min", value: "36%", width: "12%", active: false },
              ].map((bar) => (
                <div key={bar.time} className="flex items-center gap-4">
                  <span className="w-20 text-right text-sm font-bold text-slate-500">{bar.time}</span>
                  <div className="relative h-10 flex-1 rounded-full bg-slate-50 overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${bar.active ? 'bg-[#22C55E]' : 'bg-slate-200'}`}
                      style={{ width: bar.width }}
                    >
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold ${bar.active ? 'text-white' : 'text-slate-500'}`}>
                        {bar.value}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Comparação */}
          {/* Tabela de Comparação */}
          <div className="mt-24 overflow-hidden rounded-[40px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
            <div className="grid grid-cols-2">
              {/* Header */}
              <div className="bg-[#FFF1F2] p-8 text-center border-b border-slate-100 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2 text-[#F43F5E] font-bold font-space-grotesk text-xl">
                  <TrendingDown className="h-5 w-5" />
                  Sem Next Pro
                </div>
              </div>
              <div className="bg-[#F0FDF4] p-8 text-center border-b border-slate-100 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2 text-[#10B981] font-bold font-space-grotesk text-xl">
                  <TrendingUp className="h-5 w-5" />
                  Com Next Pro
                </div>
              </div>

              {/* Rows */}
              {[
                ["Lead às 22h? Só vê resposta às 8h", "Resposta em 3 segundos, qualquer horário"],
                ["78% dos leads perdidos por demora", "391% mais conversão no primeiro minuto"],
                ["R$ 12 por clique que vira prejuízo", "Cada real investido vira oportunidade"],
                ["Cliente irritado vai pro concorrente", "Lead qualificado e agendado automaticamente"],
                ["Final de semana sem atendimento", "Funciona 24/7, inclusive feriados"],
              ].map((row, idx) => (
                <React.Fragment key={idx}>
                  <div className={`p-8 border-r border-slate-100 flex items-center gap-4 transition-colors hover:bg-[#FFFBFB] ${idx !== 4 ? 'border-b' : ''}`}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#F43F5E]">
                      <X className="h-3 w-3" strokeWidth={4} />
                    </div>
                    <span className="text-[17px] font-medium text-slate-600">{row[0]}</span>
                  </div>
                  <div className={`p-8 flex items-center gap-4 transition-colors hover:bg-[#F7FEE7] ${idx !== 4 ? 'border-b' : ''}`}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#10B981]">
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </div>
                    <span className="text-[17px] font-bold text-slate-800">{row[1]}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="mt-16">
            <p className="text-lg font-medium text-slate-900">
              O Next Pro responde em 3 segundos. Sempre. Inclusive às 3h da manhã de um domingo.
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button className="btn-press rounded-full bg-black px-10 py-7 text-lg font-bold text-white hover:bg-zinc-800">
                Parar de perder leads agora →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CASOS REAIS */}
      <section id="depoimentos" className="bg-[#fafbfc] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Sticky Content */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <span className="inline-flex items-center gap-2 font-space-grotesk text-sm font-semibold text-[#004DFF] mb-4">
                <span className="inline-block h-2 w-2 rounded-full bg-[#004DFF]" />
                // Casos reais
              </span>
              <h2 className="font-space-grotesk text-4xl lg:text-5xl font-bold text-[#0f172a] leading-tight mb-6">
                Resultados reais para negócios em escala.
              </h2>
              <p className="text-lg text-[#64748b] mb-8 leading-relaxed max-w-md">
                Empresas que automatizaram atendimento, vendas e cobrança com o CRM Next Pro. Verificados por prints e relatos dos próprios clientes.
              </p>

              <div className="flex items-center gap-4 p-5 bg-white border border-[#e8ecf1] rounded-2xl shadow-sm">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6 text-[#3b82f6]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0f172a]">Métricas Verificadas</p>
                  <p className="text-xs text-[#94a3b8]">Dados auditados e extraídos diretamente do dashboard.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Case Cards */}
            <div className="lg:col-span-7 space-y-8">
              {visibleCases.map((c) => {
                const meta = caseMeta[c.name];
                const metric1 = c.before[0];
                const metric1After = c.after[0];
                const metric2 = c.before[1];
                const metric2After = c.after[1];
                return (
                  <div
                    key={c.name}
                    className="group animate-fade-in bg-white rounded-3xl border border-[#e8ecf1] p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,77,255,0.08)]"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={c.avatar} alt={c.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-[#e8ecf1]" />
                          <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#004DFF] flex items-center justify-center ring-2 ring-white">
                            <Check className="h-3 w-3 text-white" strokeWidth={4} />
                          </span>
                        </div>
                        <div>
                          <h4 className="font-space-grotesk font-bold text-[#0f172a] text-lg">{c.name}</h4>
                          <p className="text-sm text-[#94a3b8]">{c.role}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-[#94a3b8]">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{meta?.location}</span>
                            <span className="h-0.5 w-0.5 rounded-full bg-[#e8ecf1]" />
                            <span>{meta?.since}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-widest border border-green-100">
                        Verificado
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-5 rounded-2xl bg-[#fafbfc] border border-[#e8ecf1]">
                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Antes do Next Pro</p>
                        <p className="text-xl font-space-grotesk font-bold text-[#0f172a]">
                          {metric1.value}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-1">{metric1.label}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100">
                        <p className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider mb-2">Hoje</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-space-grotesk font-bold text-[#004DFF]">{metric1After.value}</p>
                          <span className="text-xs font-bold text-green-600">{meta?.deltas?.[0]}</span>
                        </div>
                        <p className="text-xs text-[#3b82f6] mt-1">{metric1After.label}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-5 rounded-2xl bg-[#fafbfc] border border-[#e8ecf1]">
                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Antes do Next Pro</p>
                        <p className="text-xl font-space-grotesk font-bold text-[#0f172a]">
                          {metric2.value}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-1">{metric2.label}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100">
                        <p className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider mb-2">Hoje</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-space-grotesk font-bold text-[#004DFF]">{metric2After.value}</p>
                          <span className="text-xs font-bold text-green-600">{meta?.deltas?.[1]}</span>
                        </div>
                        <p className="text-xs text-[#3b82f6] mt-1">{metric2After.label}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#004DFF]">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {c.result}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8ecf1] px-3 py-1.5 text-[10px] font-medium text-[#94a3b8]">
                        <Calendar className="h-3 w-3" />
                        {meta?.period}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Quote className="h-4 w-4 text-[#e8ecf1] shrink-0 mt-0.5" />
                      <p className="text-sm text-[#64748b] leading-relaxed">{c.quote}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-[#94a3b8] inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#94a3b8]" />
              Métricas compartilhadas voluntariamente pelos clientes · Prints e comprovantes sob solicitação
            </p>
          </div>
        </div>
      </section>

      <LandingFAQ />

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[28px] bg-[#f4f1ec] px-8 py-8 md:px-12 md:py-10">

          <div className="relative grid items-center gap-8 md:grid-cols-[1.15fr_0.85fr]">
            {/* Texto */}
            <div>
              <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold leading-[1.1] tracking-tight text-slate-900">
                Comece a fazer seus<br />clientes voltarem hoje
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                Configure em minutos e veja a Next Pro trabalhar por você. Sem compromisso.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/auth">
                  <Button className="h-9 rounded-xl bg-[#004DFF] px-5 text-sm font-semibold text-white hover:bg-[#0040d6]">
                    Testar grátis
                  </Button>
                </Link>
                <a href="#planos">
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl border-slate-900/20 bg-transparent px-5 text-sm font-semibold text-slate-900 hover:bg-slate-900/5 hover:text-slate-900"
                  >
                    Ver planos
                  </Button>
                </a>
              </div>

              <div className="mt-7 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[
                    { l: "M1", bg: "bg-zinc-800" },
                    { l: "M2", bg: "bg-zinc-700" },
                    { l: "M3", bg: "bg-zinc-600" },
                    { l: "M4", bg: "bg-zinc-500" },
                  ].map((m) => (
                    <span
                      key={m.l}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f4f1ec] text-[10px] font-bold text-white ${m.bg}`}
                    >
                      {m.l}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">+200 lojas</span> já utilizam
                </p>
              </div>

            </div>

            {/* Card métrica */}
            <div className="relative mx-auto w-full max-w-[260px] py-4">
              <div className="pointer-events-none absolute inset-0 scale-90 rounded-full bg-[#004DFF]/15 blur-3xl" />

              <div className="group relative rotate-3 rounded-[28px] border border-slate-900/10 bg-gradient-to-br from-white/60 to-white/30 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-500 hover:rotate-0">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#004DFF]/20">
                    <TrendingUp className="h-5 w-5 text-[#3f7bff]" />
                  </div>
                  <span className="rounded-full bg-[#004DFF]/15 px-3 py-1 text-[10px] font-bold tracking-wide text-[#004DFF]">
                    AO VIVO
                  </span>
                </div>

                <div className="font-space-grotesk text-4xl font-bold tracking-tight text-slate-900">+36%</div>
                <p className="mt-1 text-sm text-slate-600">Taxa de recompra</p>

                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-900/10">
                  <div className="h-full w-[36%] rounded-full bg-[#004DFF] shadow-[0_0_10px_#004DFF]" />
                </div>

                <div className="mt-5 flex -space-x-3">
                  <span className="h-7 w-7 rounded-full bg-zinc-700 ring-2 ring-[#f4f1ec]" />
                  <span className="h-7 w-7 rounded-full bg-zinc-600 ring-2 ring-[#f4f1ec]" />
                  <span className="h-7 w-7 rounded-full bg-zinc-500 ring-2 ring-[#f4f1ec]" />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#004DFF] text-[9px] font-bold text-white ring-2 ring-[#f4f1ec]">
                    +8k
                  </span>
                </div>
              </div>

              {/* Badge flutuante */}
              <div className="absolute -bottom-3 -left-3 -rotate-6 rounded-2xl bg-white px-3 py-2 shadow-2xl">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <span className="text-xs font-bold text-black">IA Ativa</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
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
                <a href="https://x.com/nextprocrm" target="_blank" rel="noreferrer" aria-label="Twitter" className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors">
                  <Twitter className="h-3 w-3" />
                </a>
                <a href="https://instagram.com/nextprocrm" target="_blank" rel="noreferrer" aria-label="Instagram" className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors">
                  <Instagram className="h-3 w-3" />
                </a>
                <a href="#planos" aria-label="Presentes" className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors">
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
                <li><Link to="/auth" className="hover:text-primary transition-colors">Download</Link></li>
                <li><Link to="/central-de-ajuda" className="hover:text-primary transition-colors">FAQ</Link></li>
              </ul>
            </div>

            {/* Suporte */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Suporte</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li><Link to="/central-de-ajuda" className="flex items-center gap-1.5 hover:text-primary transition-colors"><HelpCircle className="h-3.5 w-3.5" /> Central de Ajuda</Link></li>
                <li><a href="https://wa.me/message/BYSDMLHYTA6EA1" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-600 transition-colors"><MessageCircle className="h-3.5 w-3.5" /> Comunidade VIP</a></li>
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

          <div className="mt-8 border-y border-slate-200 py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-500 md:gap-10">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#004DFF]" />
                <span>Dados Criptografados · SSL/TLS 256-bit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-[#004DFF]" />
                <span>Conforme LGPD · Lei 13.709/2018</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-[#004DFF]" />
                <span>Pagamento Seguro · Mercado Pago Certificado</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] tracking-widest uppercase text-slate-400">
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

      <CookieConsent />
      <ChatWidget />
    </div>
  );
}
