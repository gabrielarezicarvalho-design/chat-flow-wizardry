import { Link } from "react-router-dom";
import SectionLink from "@/components/layout/SectionLink";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import logoAurora from "@/assets/logo-aurora.png.asset.json";
import { Globe, Sun, ArrowRight, Sparkles, Bot, Zap, Headphones, Megaphone, MapPin, CreditCard } from "lucide-react";

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
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-70 transition-transform group-data-[state=open]:rotate-180"
          >
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
          <div className="grid grid-cols-2 gap-3 p-5">
            {FEATURES.map((feature) => (
              <SectionLink
                key={feature.title}
                hash={feature.href}
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
              </SectionLink>
            ))}
          </div>

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
            <SectionLink
              hash="ia"
              className="relative z-10 mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#004DFF] transition-opacity hover:opacity-80"
            >
              Ver como funciona <ArrowRight className="h-3.5 w-3.5" />
            </SectionLink>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const LandingNav = () => {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-2xl border border-white/40 bg-white/80 px-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-10">
          <Link
            to="/homepage"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 whitespace-nowrap font-bold text-xl font-space-grotesk text-slate-900"
          >
            <img src={logoAurora.url} alt="NEXT PRO" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            <span>
              NEXT <span className="text-[#004DFF]">PRO</span>
            </span>
            <span className="rounded-md bg-[#004DFF]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#004DFF]">
              Beta
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[15px] text-slate-600">
            <FeaturesPopover label="Inteligência" />
            <SectionLink hash="depoimentos" className="hover:text-slate-900">
              Como Funciona
            </SectionLink>
            <SectionLink hash="planos" className="hover:text-slate-900">
              Preços
            </SectionLink>
            <SectionLink hash="pagamentos" className="hover:text-slate-900">
              Blog
            </SectionLink>
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
  );
};

export default LandingNav;
