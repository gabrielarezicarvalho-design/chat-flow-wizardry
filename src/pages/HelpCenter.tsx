import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, Search, MessageCircle, Clock, HelpCircle, ChevronDown } from "lucide-react";
import LandingNav from "@/components/layout/LandingNav";
import LandingFooter from "@/components/layout/LandingFooter";

const FAQS: { q: string; a: string }[] = [
  { q: "Como funciona a compra na Next Pro?", a: "Escolha um plano, finalize o pagamento via Pix ou cartão e a licença é ativada automaticamente na sua conta." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos Pix, cartão de crédito e boleto através do nosso processador Mercado Pago." },
  { q: "Quanto tempo leva para receber meu pedido?", a: "Pagamentos via Pix e cartão são liberados em poucos minutos após a confirmação." },
  { q: "Posso solicitar reembolso?", a: "Sim. Oferecemos garantia de 7 dias conforme o Código de Defesa do Consumidor." },
  { q: "O que são os Créditos da Extensão?", a: "Créditos são utilizados para consumo de recursos de IA, disparos em massa e prospecção automática." },
  { q: "Como recebo os créditos após pagar?", a: "Os créditos são creditados automaticamente na sua conta assim que o pagamento é confirmado." },
  { q: "Como funcionam as contas com plano ilimitado?", a: "O plano Business libera todos os recursos sem limites mensais de disparos, contatos, agentes ou fluxos." },
  { q: "Como instalar e ativar a Extensão Next Pro?", a: "Após a compra, acesse a área de Downloads no painel, baixe a extensão e siga o guia de ativação." },
  { q: "Minha licença expirou. O que fazer?", a: "Renove sua assinatura na aba Minha Conta ou entre em contato com o suporte para regularizar." },
  { q: "Posso comprar mais de um pacote ou produto?", a: "Sim, você pode contratar múltiplos planos e complementos diretamente pelo painel." },
];

export default function HelpCenter() {
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const filtered = useMemo(
    () => FAQS.filter(f => f.q.toLowerCase().includes(query.toLowerCase()) || f.a.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="light min-h-screen bg-white text-slate-900">
      <LandingNav />

      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <LifeBuoy className="h-3.5 w-3.5" /> Suporte
          </div>
          <h1 className="font-['Space_Grotesk'] text-5xl md:text-6xl font-bold tracking-tight">
            Central de{" "}
            <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
              Suporte
            </span>
          </h1>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            Encontre respostas no FAQ ou abra um ticket para falar diretamente conosco.
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto pt-4">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 mt-2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar nas perguntas frequentes..."
              className="w-full rounded-full border border-slate-200 bg-white pl-12 pr-5 py-3.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* WhatsApp card */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Fale Conosco pelo WhatsApp</h3>
              <p className="text-sm text-slate-500">Atendimento rápido e humanizado.</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Resposta rápida</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Suporte 24/7</span>
              </div>
            </div>
          </div>
          <a
            href="https://wa.me/message/BYSDMLHYTA6EA1"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:brightness-110 transition"
          >
            <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
          </a>
        </div>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-5">
            <HelpCircle className="h-5 w-5 text-primary" /> Perguntas Frequentes
          </h2>

          <div className="space-y-3">
            {filtered.map((f, i) => {
              const isOpen = openIdx === i;
              return (
                <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-slate-900 text-sm">{f.q}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-0 text-sm text-slate-500 border-t border-slate-100">
                      <p className="pt-3">{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-sm text-slate-500 py-8">Nenhuma pergunta encontrada.</div>
            )}
          </div>

          <div className="mt-10 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-primary transition-colors">
              ← Voltar para o início
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
