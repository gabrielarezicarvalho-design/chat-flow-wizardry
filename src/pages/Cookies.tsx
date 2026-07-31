import { useEffect, ReactNode } from "react";
import { Cookie } from "lucide-react";
import { Link } from "react-router-dom";
import LandingNav from "@/components/layout/LandingNav";
import LandingFooter from "@/components/layout/LandingFooter";

const COMPANY = "Next Pro";
const CNPJ = "65.146.817/0001-18";
const EMAIL = "suporte@nextprodev.com.br";
const UPDATED = "Julho de 2026";

const H2 = ({ children }: { children: ReactNode }) => (
  <h2
    className="mt-10 first:mt-0 text-xl md:text-2xl font-bold text-slate-900"
    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
  >
    {children}
  </h2>
);

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-4 text-[15px] leading-7 text-slate-600">{children}</p>
);

const UL = ({ items }: { items: ReactNode[] }) => (
  <ul className="mt-4 space-y-2.5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-600">
        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
        <span>{it}</span>
      </li>
    ))}
  </ul>
);

const B = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-slate-900">{children}</strong>
);

const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-[13px] text-primary">{children}</code>
);

type CookieCard = { title: string; desc: string; rows: [string, string][] };

const cookieCards: CookieCard[] = [
  {
    title: "Cookies Essenciais",
    desc: "Necessários para o funcionamento básico do site (sessão, autenticação, segurança). Sem eles, o site não funciona corretamente.",
    rows: [
      ["sb-*-auth-token", "Autenticação do usuário (Sessão)"],
      ["theme", "Preferência de tema claro/escuro (1 ano)"],
    ],
  },
  {
    title: "Cookies de Desempenho",
    desc: "Coletam informações sobre como você usa o site (páginas visitadas, erros) para melhorar a experiência.",
    rows: [
      ["_ga", "Google Analytics — identificação de usuário (2 anos)"],
      ["_gid", "Google Analytics — identificação de sessão (24 horas)"],
      ["_gat", "Google Analytics — limitação de taxa (1 minuto)"],
    ],
  },
  {
    title: "Cookies de Funcionalidade",
    desc: "Permitem que o site lembre suas escolhas e ofereça uma experiência mais personalizada.",
    rows: [
      ["cookie-consent", "Preferências de cookies (1 ano)"],
      ["pwa-dismissed", "Banner de instalação PWA (30 dias)"],
    ],
  },
  {
    title: "Cookies de Marketing",
    desc: "Usados para medir campanhas e exibir anúncios mais relevantes.",
    rows: [
      ["_fbp", "Meta (Facebook) Pixel (90 dias)"],
      ["_gcl_au", "Google Ads (90 dias)"],
    ],
  },
];

const Cookies = () => {
  useEffect(() => {
    document.title = `Política de Cookies | ${COMPANY}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        `Política de Cookies da ${COMPANY}: quais cookies utilizamos, para que servem, como gerenciá-los e seus direitos conforme a LGPD.`,
      );
    }
  }, []);

  return (
    <div className="light min-h-screen bg-[#fafaf8] text-slate-900 flex flex-col">
      <LandingNav />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pt-16 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
            <Cookie className="h-3.5 w-3.5" />
            Cookies
          </div>
          <h1
            className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Política de <span className="text-primary">Cookies</span>
          </h1>
          <p className="mt-4 text-slate-500 text-[15px]">
            Última atualização: {UPDATED} · {COMPANY} · CNPJ {CNPJ}
          </p>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-20">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-12 shadow-sm">
            <H2>O que são Cookies?</H2>
            <P>
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita o site.
              Eles ajudam a proporcionar uma melhor experiência, lembrando preferências e entendendo como você
              usa a Plataforma.
            </P>

            <H2>Tipos de Cookies que Utilizamos</H2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {cookieCards.map((c) => (
                <div key={c.title} className="rounded-2xl border border-slate-200 bg-[#fcfcfb] p-5">
                  <h3
                    className="text-base font-bold text-primary"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {c.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-6 text-slate-600">{c.desc}</p>
                  <div className="mt-4 space-y-2">
                    {c.rows.map(([name, desc]) => (
                      <p key={name} className="text-[14px] leading-6 text-slate-600">
                        <Code>{name}</Code> — {desc}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <H2>Como Gerenciar Cookies</H2>
            <P>
              Você pode controlar e/ou excluir cookies pelo seu navegador. Ao bloqueá-los, algumas
              funcionalidades podem deixar de operar corretamente.
            </P>
            <UL
              items={[
                <><B>Chrome:</B> Configurações → Privacidade e segurança → Cookies</>,
                <><B>Firefox:</B> Opções → Privacidade e Segurança → Cookies</>,
                <><B>Safari:</B> Preferências → Privacidade → Gerenciar Dados do Site</>,
                <><B>Edge:</B> Configurações → Cookies e permissões do site</>,
              ]}
            />

            <H2>Cookies e Provedores de Terceiros</H2>
            <P>
              Utilizamos cookies de terceiros confiáveis (Google Analytics, Meta Pixel, Supabase). Além de
              cookies, a Plataforma compartilha dados com nossa <B>tecnologia de conexão WhatsApp</B>,{" "}
              <B>OpenAI</B> e <B>Google Gemini</B> (IA) — esse compartilhamento{" "}
              <B>não ocorre via cookies</B>, e os detalhes estão na nossa{" "}
              <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              .
            </P>
            <UL
              items={[
                <>
                  <B>Google Analytics:</B>{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Política do Google
                  </a>
                </>,
                <>
                  <B>Meta (Facebook) Pixel:</B>{" "}
                  <a
                    href="https://www.facebook.com/privacy/policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Política da Meta
                  </a>
                </>,
                <>
                  <B>Supabase:</B>{" "}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Política do Supabase
                  </a>
                </>,
              ]}
            />

            <H2>Seus Direitos (LGPD)</H2>
            <P>
              Conforme a LGPD (Lei nº 13.709/2018), você pode acessar, corrigir, excluir cookies não
              essenciais, revogar consentimento e portar seus dados. Para isso, use as configurações do
              navegador ou entre em contato. Caso não esteja satisfeito, pode reclamar à <B>ANPD</B>.
            </P>

            <H2>Contato</H2>
            <UL
              items={[
                <>
                  <B>Empresa:</B> {COMPANY} · <B>CNPJ:</B> {CNPJ}
                </>,
                <>
                  <B>E-mail / DPO:</B>{" "}
                  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                    {EMAIL}
                  </a>
                </>,
              ]}
            />
            <P>
              Caso não esteja satisfeito, você pode reclamar à Autoridade Nacional de Proteção de
              Dados (ANPD).
            </P>

          </article>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Cookies;
