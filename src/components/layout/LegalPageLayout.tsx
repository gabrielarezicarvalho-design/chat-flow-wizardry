import { ReactNode } from "react";
import { LucideIcon, Calendar, MessageCircle } from "lucide-react";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import { Button } from "@/components/ui/button";

export interface LegalSection {
  icon: LucideIcon;
  title: string;
  body?: ReactNode;
  bullets?: ReactNode[];
}

interface LegalPageLayoutProps {
  badgeIcon: LucideIcon;
  badgeLabel: string;
  title: string;
  subtitle: string;
  updatedAt?: string;
  sections: LegalSection[];
}

const LegalPageLayout = ({
  badgeIcon: BadgeIcon,
  badgeLabel,
  title,
  subtitle,
  updatedAt,
  sections,
}: LegalPageLayoutProps) => {
  const dateLabel =
    updatedAt ?? new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="light min-h-screen bg-white text-slate-900 flex flex-col">
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-[11px] font-semibold tracking-widest uppercase">
            <BadgeIcon className="h-3.5 w-3.5" />
            {badgeLabel}
          </div>
          <h1
            className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {title}
          </h1>
          <p className="mt-4 text-slate-500 text-base md:text-lg leading-relaxed">{subtitle}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">
            <Calendar className="h-3.5 w-3.5" />
            Atualizado em {dateLabel}
          </div>
        </section>

        {/* Sections */}
        <section className="mx-auto max-w-3xl px-6 pb-16 space-y-4">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <article
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-400">
                      Seção {String(i + 1).padStart(2, "0")}
                    </div>
                    <h2
                      className="mt-1 text-xl md:text-2xl font-bold text-slate-900"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {s.title}
                    </h2>
                    {s.body && (
                      <div className="mt-3 text-sm md:text-[15px] leading-relaxed text-slate-600">
                        {s.body}
                      </div>
                    )}
                    {s.bullets && s.bullets.length > 0 && (
                      <ul className="mt-3 space-y-2 text-sm md:text-[15px] text-slate-600">
                        {s.bullets.map((b, bi) => (
                          <li key={bi} className="flex gap-3">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span className="leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {/* CTA */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3
                  className="text-lg md:text-xl font-bold text-slate-900"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Ainda tem dúvidas?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Fale com nossa equipe de suporte oficial e receba ajuda rápida.
                </p>
              </div>
            </div>
            <a href="https://wa.me/message/BYSDMLHYTA6EA1" target="_blank" rel="noreferrer">
              <Button className="rounded-full bg-primary hover:bg-primary-dark px-6">
                Falar com suporte
              </Button>
            </a>
          </article>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default LegalPageLayout;
