import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoAurora from "@/assets/logo-aurora.png.asset.json";

const LandingNav = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg font-space-grotesk text-slate-900">
          <img
            src={logoAurora.url}
            alt="NEXT PRO"
            className="h-8 w-8 rounded-full object-cover"
          />
          NEXT <span className="text-[#004DFF]">PRO</span>
        </Link>
        <div className="hidden md:flex items-center gap-4">
          <nav className="flex items-center gap-8 text-sm text-slate-600">
            <Link to="/#recursos" className="hover:text-slate-900">Recursos</Link>
            <Link to="/#ia" className="hover:text-slate-900">IA</Link>
            <Link to="/#pagamentos" className="hover:text-slate-900">Pagamentos</Link>
            <Link to="/#segmentos" className="hover:text-slate-900">Segmentos</Link>
            <Link to="/#depoimentos" className="hover:text-slate-900">Clientes</Link>
          </nav>
          <Link to="/auth">
            <Button className="bg-primary hover:bg-primary-dark rounded-full px-5">Entrar</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LandingNav;
