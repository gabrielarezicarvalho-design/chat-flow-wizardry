import { useState, createContext, useContext } from "react";
import { NavLink } from "@/components/NavLink";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess, FeatureId } from "@/hooks/useFeatureAccess";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  Phone, 
  Link as LinkIcon, 
  Briefcase, 
  UsersRound, 
  Contact, 
  Megaphone, 
  GitBranch, 
  FileText, 
  ClipboardList,
  LogOut,
  Shield,
  Headphones,
  Ticket,
  MessagesSquare,
  Bug,
  ChevronLeft,
  ChevronRight,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Create context for sidebar state
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebarContext = () => useContext(SidebarContext);

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  feature?: FeatureId;
}

// Admin-only navigation items with feature requirements
const adminNavItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/internal-chat", icon: MessagesSquare, label: "Chat Interno", feature: "internal_chat" },
  { to: "/agents", icon: Sparkles, label: "Meus Agentes", feature: "ai_agents" },
  { to: "/ai-tickets", icon: Ticket, label: "Chamados IA", feature: "ai_agents" },
  { to: "/mass-sending", icon: Megaphone, label: "Envio em Massa", feature: "mass_sending" },
  { to: "/auto-prospecting", icon: Target, label: "Prospecção Automática", feature: "mass_sending" },
  { to: "/smart-forms", icon: ClipboardList, label: "Smart Forms", feature: "smart_forms" },
  { to: "/formularios", icon: FileText, label: "Respostas", feature: "smart_forms" },
  { to: "/contacts", icon: Contact, label: "Contatos", feature: "leads_management" },
  { to: "/departments", icon: Briefcase, label: "Departamentos", feature: "departments" },
  { to: "/flows", icon: GitBranch, label: "Flow Builder", feature: "flows_basic" },
  { to: "/connections", icon: LinkIcon, label: "Conexões" },
  { to: "/users", icon: UsersRound, label: "Usuários" },
  { to: "/feedback", icon: Bug, label: "Bugs & Melhorias" },
  { to: "/attendance", icon: Phone, label: "Atendimentos", feature: "chat" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

// Agent-only navigation items with feature requirements
const agentNavItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Painel" },
  { to: "/internal-chat", icon: MessagesSquare, label: "Chat Interno", feature: "internal_chat" },
  { to: "/conversations", icon: MessageSquare, label: "Conversas", feature: "chat" },
  { to: "/contacts", icon: Contact, label: "Contatos", feature: "leads_management" },
  { to: "/feedback", icon: Bug, label: "Bugs & Melhorias" },
  { to: "/attendance-reports", icon: ClipboardList, label: "Histórico", feature: "reports" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ collapsed = false, onToggle }: SidebarProps) => {
  const { isAdmin, isAgent, role, isLoading: roleLoading } = useUserRole();
  const { user, signOut } = useAuth();
  const { hasAccess } = useFeatureAccess();

  const getFilteredNavItems = () => {
    const baseItems = isAdmin ? adminNavItems : agentNavItems;
    return baseItems.filter(item => {
      if (!item.feature) return true;
      return hasAccess(item.feature);
    });
  };

  const navItems = getFilteredNavItems();

  const getRoleBadge = () => {
    if (roleLoading) return null;
    if (isAdmin) {
      return (
        <Badge variant="secondary" className={cn(
          "bg-yellow-500/20 text-yellow-200 border-yellow-500/30 text-xs",
          collapsed && "p-1"
        )}>
          <Shield className="w-3 h-3" />
          {!collapsed && <span className="ml-1">Admin</span>}
        </Badge>
      );
    }
    if (isAgent) {
      return (
        <Badge variant="secondary" className={cn(
          "bg-green-500/20 text-green-200 border-green-500/30 text-xs",
          collapsed && "p-1"
        )}>
          <Headphones className="w-3 h-3" />
          {!collapsed && <span className="ml-1">Agente</span>}
        </Badge>
      );
    }
    return null;
  };

  const getInitials = (email: string | undefined) => {
    if (!email) return "??";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-gradient-to-b from-primary to-primary-dark text-white shadow-xl z-50 transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn("border-b border-white/10", collapsed ? "p-4" : "p-6")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0",
              collapsed ? "w-10 h-10" : "w-10 h-10"
            )}>
              <Sparkles className="w-6 h-6" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold">MARKETFLOW</h1>
                <p className="text-xs text-white/70">Automação Inteligente</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className={cn(
            "absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary border-2 border-white/20 flex items-center justify-center hover:bg-primary-dark transition-colors shadow-lg",
            "hover:scale-110"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-white" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-white" />
          )}
        </button>

        {/* Role indicator */}
        <div className={cn("py-2", collapsed ? "px-3 flex justify-center" : "px-4")}>
          {getRoleBadge()}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={cn(
                "flex items-center gap-3 rounded-lg text-white/80 hover:bg-white/10 transition-all group relative",
                collapsed ? "px-3 py-3 justify-center" : "px-4 py-3"
              )}
              activeClassName="bg-white/20 text-white font-medium shadow-lg"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info & logout */}
        <div className={cn("border-t border-white/10 space-y-2", collapsed ? "p-2" : "p-4")}>
          <div className={cn(
            "flex items-center gap-3 rounded-lg bg-white/5",
            collapsed ? "px-3 py-3 justify-center" : "px-4 py-3"
          )}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {getInitials(user?.email)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.email?.split("@")[0] || "Usuário"}
                </p>
                <p className="text-xs text-white/60 truncate">
                  {role ? (isAdmin ? "Administrador" : "Atendente") : "Carregando..."}
                </p>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            className={cn(
              "w-full gap-3 text-white/70 hover:text-white hover:bg-white/10",
              collapsed ? "justify-center px-3 py-3" : "justify-start px-4 py-3"
            )}
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};
