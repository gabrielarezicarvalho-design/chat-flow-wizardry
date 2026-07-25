import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  LayoutDashboard, Building2, Users, Bot, Plug, Brain, BarChart3, 
  CreditCard, Shield, Settings, LogOut, ChevronLeft,
  ChevronRight, Loader2, Menu, HardDrive, FileText, Bug, BookOpen, Code2, TrendingUp, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", description: "Visão geral" },
  { id: "contrato", icon: FileText, label: "Contrato Evolution", description: "Conexões WhatsApp" },
  { id: "empresas", icon: Building2, label: "Empresas", description: "Clientes" },
  
  { id: "usuarios", icon: Users, label: "Usuários Internos", description: "Equipe MarketFlow" },
  { id: "agentes", icon: Bot, label: "Agentes", description: "Global" },
  { id: "integracoes", icon: Plug, label: "Integrações", description: "APIs & Webhooks" },
  { id: "whatsapp-meta", icon: Menu, label: "WhatsApp Meta API", description: "Config Global", parent: "integracoes" },
  { id: "apify", icon: Zap, label: "Apify Scrapers", description: "Instagram/TikTok/FB", parent: "integracoes" },
  { id: "armazenamento", icon: HardDrive, label: "Armazenamento", description: "Drive & Storage" },
  { id: "ia", icon: Brain, label: "IA & Automação", description: "Modelos & Uso" },
  { id: "programador", icon: Code2, label: "Programador IA", description: "Diagnóstico & Debug" },
  { id: "feedback", icon: Bug, label: "Bugs & Melhorias", description: "Feedbacks" },
  { id: "metricas", icon: TrendingUp, label: "Métricas de Uso", description: "Por Empresa" },
  { id: "relatorios", icon: BarChart3, label: "Relatórios", description: "Globais" },
  { id: "faturamento", icon: CreditCard, label: "Planos & Faturamento", description: "Assinaturas" },
  { id: "seguranca", icon: Shield, label: "Segurança", description: "Auditoria" },
  { id: "configuracoes", icon: Settings, label: "Configurações", description: "Gerais" },
  { id: "documentacao", icon: BookOpen, label: "Documentação API", description: "Integração Externa" },
];

export function AdminLayout({ children, activeSection, onSectionChange }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isLoading: roleLoading } = useUserRole();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!roleLoading && role !== "admin") {
      toast.error("Acesso negado. Apenas administradores.");
      navigate("/admin-login");
    }
  }, [role, roleLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login");
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-slate-900/95 backdrop-blur-xl transition-all duration-300",
          collapsed ? "w-20" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold">
                  Market<span className="text-emerald-400">Flow</span>
                </h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3 text-slate-400" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-slate-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                  (item as any).parent && !collapsed && "ml-4",
                  activeSection === item.id 
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 text-emerald-400" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                  (item as any).parent && "h-7 w-7",
                  activeSection === item.id 
                    ? "bg-emerald-500/20" 
                    : "bg-white/5 group-hover:bg-white/10"
                )}>
                  <item.icon className={cn("h-4 w-4", (item as any).parent && "h-3.5 w-3.5")} />
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left">
                    <p className={cn("text-sm font-medium", (item as any).parent && "text-xs")}>{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.description}</p>
                  </div>
                )}
                {activeSection === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10",
              collapsed ? "justify-center px-0" : "justify-start"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}
