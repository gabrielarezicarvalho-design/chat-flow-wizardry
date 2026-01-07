import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useSupabaseStatusNotifications } from "@/hooks/useSupabaseStatusNotifications";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  noPadding?: boolean;
}

export const MainLayout = ({ children, noPadding = false }: MainLayoutProps) => {
  // Enable real-time Supabase status notifications
  useSupabaseStatusNotifications();
  
  // Get saved sidebar state from localStorage
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === "true";
  });

  // Save sidebar state to localStorage
  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar_collapsed", String(newState));
  };
  
  return (
    <div className="h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <TopBar sidebarCollapsed={collapsed} />
      <main className={cn(
        "pt-16 h-full transition-all duration-300",
        collapsed ? "ml-20" : "ml-64",
        !noPadding && "overflow-auto"
      )}>
        <div className={noPadding ? 'h-[calc(100vh-4rem)]' : 'p-6'}>
          {children}
        </div>
      </main>
    </div>
  );
};
