import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, ChevronDown } from "lucide-react";
import LandingNav from "@/components/layout/LandingNav";
import LandingFooter from "@/components/layout/LandingFooter";

const FAQS: { q: string; a: string }[] = [
  { q: "Não tenho conhecimento em tecnologia ou programação, e agora?", a: "Sem problemas. A Next Pro foi feita para ser simples: você configura tudo por cliques, com fluxos prontos e suporte humano para te ajudar na implantação." },
  { q: "Como posso integrar meu WhatsApp à Next Pro?", a: "Basta ler um QR Code dentro do painel. Em poucos segundos seu número está conectado e pronto para atender." },
  { q: "Como funciona a compra na Next Pro?", a: "Escolha um plano, finalize o pagamento via Pix ou cartão e a licença é ativada automaticamente na sua conta." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos Pix, cartão de crédito e boleto através do nosso processador Mercado Pago." },
  { q: "Usam a API Oficial?", a: "Sim. Trabalhamos com integração oficial e também com conexão via QR Code, você escolhe o modelo ideal para o seu negócio." },
  { q: "O chatbot reconhece áudio?", a: "Sim. A IA transcreve áudios recebidos e pode responder também em áudio com voz clonada." },
  { q: "Como funciona o Agente de IA integrado ao site?", a: "O agente lê o conteúdo do seu site e responde dúvidas de clientes com base nessas informações, 24 horas por dia." },
  { q: "Para quais negócios a IA lendo o site é mais indicada?", a: "Lojas físicas, e-commerces, clínicas, salões, oficinas e qualquer negócio que atenda clientes pelo WhatsApp." },
  { q: "Como vou acompanhar os atendimentos?", a: "Pelo painel da Next Pro você vê todas as conversas, status, responsáveis e métricas em tempo real." },
  { q: "Posso solicitar reembolso?", a: "Sim. Oferecemos garantia de 7 dias conforme o Código de Defesa do Consumidor." },
];

export default function HelpCenter() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="light min-h-screen bg-white text-slate-900">
      <LandingNav />

      <main className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        {/* Hero */}
        <div className="text-center">
          <h1 className="font-space-grotesk text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#1a1333] whitespace-nowrap">
            FAQ - Perguntas Frequentes
          </h1>
          <p className="mt-6 text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Veja as dúvidas frequentes sobre o sistema. Se ainda assim tiver alguma dúvida, entre em contato conosco pelos meios abaixo.
          </p>
        </div>

        {/* Contact cards */}
        <div className="mt-10 flex flex-col sm:flex-row items-stretch justify-center gap-4">
          <a
            href="mailto:suporte@nextprodev.com.br"
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.10)] transition"
          >
            <span className="h-11 w-11 shrink-0 rounded-xl bg-[#004DFF] text-white flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-slate-900">suporte@nextprodev.com.br</span>
              <span className="block text-xs text-slate-400">Resposta em até 3 dias úteis</span>
            </span>
          </a>

          <a
            href="https://wa.me/message/BYSDMLHYTA6EA1"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.10)] transition"
          >
            <span className="h-11 w-11 shrink-0 rounded-xl bg-[#25D366] text-white flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-slate-900">Falar no WhatsApp</span>
              <span className="block text-xs text-slate-400">Atendimento das 09:30h às 19h</span>
            </span>
          </a>
        </div>

        {/* FAQ */}
        <section className="mt-12 space-y-4">
          {FAQS.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)] overflow-hidden"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-semibold text-slate-900 text-[15px]">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{f.a}</div>
                )}
              </div>
            );
          })}
        </section>

        <div className="mt-12 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-[#004DFF] transition-colors">
            ← Voltar para o início
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
