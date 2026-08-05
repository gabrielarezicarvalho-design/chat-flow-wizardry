import { useEffect, useState } from "react";
import { Sparkles, Tag, Clock, Repeat } from "lucide-react";

type Lead = {
  initials: string;
  name: string;
  info: string;
  time: string;
  tag: string;
  value: string;
};

const NAMES = [
  "Pedro Lima", "Ana Souza", "Lucas Martins", "Bruno Costa", "Bianca Reis",
  "Rafael Nunes", "Camila Duarte", "Tiago Moreira", "Juliana Alves", "Marcos Vieira",
  "Fernanda Rocha", "Diego Barros", "Larissa Prado", "Isabela Freitas", "Gustavo Pinho",
];

const ORIGINS = ["Meta Ads", "Instagram", "WhatsApp", "Site", "Tráfego pago", "Google", "Indicação", "TikTok"];

const INFOS = [
  "Vim pelo anúncio",
  "IA qualificou e i...",
  "Venda marcada...",
  "Pediu orçamento",
  "Quer agendar hoje",
  "Retornou contato",
  "Pagamento enviado",
  "Aguardando resposta",
];

const TIMES = ["agora", "2 min", "5 min", "8 min", "12 min", "18 min", "27 min"];

const COLUMNS = [
  { title: "Novo lead", header: "bg-[#2563EB]" },
  { title: "Em atendim...", header: "bg-[#7C3AED]" },
  { title: "Fechado", header: "bg-[#10B981]" },
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const initialsOf = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const makeLead = (): Lead => {
  const name = pick(NAMES);
  const raw = 400 + Math.floor(Math.random() * 28) * 100;
  return {
    initials: initialsOf(name),
    name,
    info: pick(INFOS),
    time: pick(TIMES),
    tag: pick(ORIGINS),
    value: `R$ ${raw.toLocaleString("pt-BR")}`,
  };
};

const parseValue = (v: string) => Number(v.replace(/[^\d]/g, ""));

const makeBoard = (): Lead[][] => [
  Array.from({ length: 1 + Math.floor(Math.random() * 2) }, makeLead),
  Array.from({ length: 1 + Math.floor(Math.random() * 2) }, makeLead),
  Array.from({ length: 2 }, makeLead),
];

export const KanbanMockup = () => {
  const [board, setBoard] = useState<Lead[][]>(() => makeBoard());
  const [notice, setNotice] = useState("Lucas Martins avançou para Fechado");
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = makeBoard();
      setBoard(next);
      const moved = pick(next.flat());
      const stage = pick(["Em atendimento", "Fechado", "Novo lead"]);
      setNotice(`${moved.name} avançou para ${stage}`);
      setPulse((p) => p + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative bg-[#FBFAFF] border border-[#EDE7FB] rounded-[24px] p-4 shadow-[0_8px_30px_rgba(139,92,246,0.06)]">
      {/* Movement Notification */}
      <div className="mb-4 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
        <span key={pulse} className="text-[13px] font-medium text-slate-800 animate-fade-in">
          {notice}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 items-start">
        {COLUMNS.map((col, colIdx) => {
          const cards = board[colIdx] || [];
          const total = cards.reduce((sum, c) => sum + parseValue(c.value), 0);
          return (
            <div key={col.title} className="bg-[#FCFBFE] border border-[#F1EDFA] rounded-2xl p-2.5 min-h-[420px]">
              {/* Header */}
              <div className={`flex items-center justify-between ${col.header} text-white px-3 py-2.5 rounded-xl shadow-sm`}>
                <span className="text-[13px] font-semibold truncate">{col.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="bg-white/95 text-slate-800 text-[10px] font-semibold rounded-md px-1.5 py-0.5">
                    R$ {total.toLocaleString("pt-BR")},00
                  </span>
                  <span className="h-4 w-4 rounded-full bg-white/95 text-slate-800 text-[9px] font-bold flex items-center justify-center">
                    {cards.length}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="mt-2.5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-400">
                Buscar contato...
              </div>

              {/* Add contact */}
              <div className="mt-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-semibold text-[#7C3AED] text-center">
                + Adicionar contato
              </div>

              {/* Cards */}
              <div className="mt-2.5 space-y-2.5">
                {cards.map((card, i) => (
                  <div
                    key={`${pulse}-${colIdx}-${i}`}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {card.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <span className="block text-[12px] font-bold text-[#1e293b] truncate">{card.name}</span>
                          <span className="text-[9px] text-slate-400 shrink-0">{card.time}</span>
                        </div>
                        <span className="block text-[11px] text-slate-500 truncate">{card.info}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 bg-[#F5F3FF] text-[#7C3AED] text-[10px] px-2 py-1 rounded-md font-semibold">
                        <Tag className="h-2.5 w-2.5" />
                        {card.tag}
                      </span>
                      <span className="text-[12px] font-semibold text-slate-700">{card.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Badges */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          { icon: Clock, label: "resposta em tempo real" },
          { icon: Repeat, label: "automação move etapas" },
          { icon: Sparkles, label: "clique para avançar" },
        ].map((badge, idx) => (
          <div key={idx} className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 border border-slate-100 shadow-sm">
            <badge.icon className="h-3.5 w-3.5 text-[#8B5CF6] shrink-0" />
            <span className="text-[11px] text-slate-600 truncate">{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanMockup;
