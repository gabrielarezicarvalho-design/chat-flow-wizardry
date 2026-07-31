import { Link } from "react-router-dom";
import SectionLink from "@/components/layout/SectionLink";
import FloatingChatButton from "@/components/landing/FloatingChatButton";
import {
  Twitter,
  Instagram,
  Gift,
  HelpCircle,
  MessageCircle,
  Shield,
  FileText,
  Cookie,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import logoAurora from "@/assets/logo-aurora.png.asset.json";
import CookieConsent from "@/components/landing/CookieConsent";

const LandingFooter = () => {
  return (
    <>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Brand */}
            <div className="lg:col-span-2 space-y-2">
              <Link
                to="/homepage"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-2"
              >
                <img src={logoAurora.url} alt="NEXT PRO" className="h-6 w-6" />
                <span
                  className="text-base font-bold tracking-tight text-slate-900"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  NEXT <span className="text-primary">PRO</span>
                </span>
              </Link>
              <p className="text-xs text-slate-500 leading-snug max-w-sm whitespace-pre-line">
                O CRM NEXT PRO é a ferramenta definitiva para quem deseja{"\u00a0"}
                {"\n"}executar disparos em massa, prospectar clientes e aumentar suas vendas, tudo em uma unica
                ferramenta.
              </p>
              <div className="flex items-center gap-1.5">
                <a
                  href="https://x.com/nextprocrm"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter"
                  className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors"
                >
                  <Twitter className="h-3 w-3" />
                </a>
                <a
                  href="https://instagram.com/nextprocrm"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors"
                >
                  <Instagram className="h-3 w-3" />
                </a>
                <SectionLink
                  hash="planos"
                  aria-label="Presentes"
                  className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-primary hover:text-primary transition-colors"
                >
                  <Gift className="h-3 w-3" />
                </SectionLink>
              </div>
            </div>

            {/* Produto */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Produto</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>
                  <SectionLink hash="recursos" className="hover:text-primary transition-colors">
                    Funcionalidades
                  </SectionLink>
                </li>
                <li>
                  <SectionLink hash="planos" className="hover:text-primary transition-colors">
                    Preços
                  </SectionLink>
                </li>
                <li>
                  <Link to="/auth" className="hover:text-primary transition-colors">
                    Download
                  </Link>
                </li>
                <li>
                  <Link to="/central-de-ajuda" className="hover:text-primary transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Suporte */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Suporte</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>
                  <Link to="/central-de-ajuda" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <HelpCircle className="h-3.5 w-3.5" /> Central de Ajuda
                  </Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/message/BYSDMLHYTA6EA1"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-600 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Comunidade VIP
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Legal</h4>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>
                  <Link to="/politica-de-privacidade" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Shield className="h-3.5 w-3.5" /> Privacidade
                  </Link>
                </li>
                <li>
                  <Link to="/termos-de-servico" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <FileText className="h-3.5 w-3.5" /> Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link to="/politica-de-cookies" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Cookie className="h-3.5 w-3.5" /> Cookies
                  </Link>
                </li>
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
      <FloatingChatButton />
    </>
  );
};

export default LandingFooter;
