import { Link } from "react-router-dom";
import { Twitter, Instagram, Gift, HelpCircle, MessageCircle, Shield, FileText, Cookie } from "lucide-react";
import logoAurora from "@/assets/logo-aurora.png.asset.json";

const LandingFooter = () => {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <img src={logoAurora.url} alt="NEXT PRO" className="h-6 w-6" />
              <span className="text-sm font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Produto</h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li><Link to="/#recursos" className="hover:text-primary transition-colors">Funcionalidades</Link></li>
              <li><Link to="/#planos" className="hover:text-primary transition-colors">Preços</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Download</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">Suporte</h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li><a href="#" className="flex items-center gap-1.5 hover:text-primary transition-colors"><HelpCircle className="h-3.5 w-3.5" /> Central de Ajuda</a></li>
              <li><a href="#" className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-600 transition-colors"><MessageCircle className="h-3.5 w-3.5" /> Comunidade VIP</a></li>
            </ul>
          </div>

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
  );
};

export default LandingFooter;
