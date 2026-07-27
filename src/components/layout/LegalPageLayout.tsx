import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface LegalPageLayoutProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const LegalPageLayout = ({ icon: Icon, title, subtitle, children }: LegalPageLayoutProps) => {
  return (
    <div className="light min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-3">
          <Icon className="h-8 w-8 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {children}

        <footer className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default LegalPageLayout;
