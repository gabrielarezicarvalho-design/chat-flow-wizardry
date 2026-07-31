import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS: { q: string; a: string }[] = [
  { q: "Não tenho conhecimento em tecnologia ou programação, e agora?", a: "Sem problemas. A Next Pro foi feita para ser simples: você configura tudo por cliques, com fluxos prontos e suporte humano para te ajudar na implantação." },
  { q: "Como posso integrar meu WhatsApp à Next Pro?", a: "Basta ler um QR Code dentro do painel. Em poucos segundos seu número está conectado e pronto para atender." },
  { q: "Como funciona a compra na Next Pro?", a: "Escolha um plano, finalize o pagamento via Pix ou cartão e a licença é ativada automaticamente na sua conta." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos Pix, cartão de crédito e boleto através do nosso processador Mercado Pago." },
  { q: "Usam a API Oficial?", a: "Sim. Trabalhamos com integração oficial e também com conexão via QR Code, você escolhe o modelo ideal para o seu negócio." },
  { q: "O chatbot reconhece áudio?", a: "Sim. A IA transcreve áudios recebidos e pode responder também em áudio com voz clonada." },
  { q: "Como funciona o Agente de IA integrado ao site?", a: "O agente lê o conteúdo do seu site e responde dúvidas de clientes com base nessas informações, 24 horas por dia." },
  { q: "Como vou acompanhar os atendimentos?", a: "Pelo painel da Next Pro você vê todas as conversas, status, responsáveis e métricas em tempo real." },
  { q: "Posso solicitar reembolso?", a: "Sim. Oferecemos garantia de 7 dias conforme o Código de Defesa do Consumidor." },
];

export default function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#004DFF]">
            <span className="h-2 w-2 rounded-full bg-[#004DFF]" />
            Dúvidas comuns
          </span>
          <h2 className="mt-4 font-space-grotesk text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#0B1220]">
            FAQ - Perguntas Frequentes
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-base leading-relaxed text-[#0B1220]/60">
            Tudo o que você precisa saber para começar a vender mais com a Next Pro.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {FAQS.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)] overflow-hidden transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-semibold text-slate-900 text-[15px]">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#004DFF] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
