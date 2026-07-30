import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Plus, Building2 } from "lucide-react";

type Estado = { uf: string; capital: string; ddd: string };

// 26 estados brasileiros (capitais + DDD principal)
const ESTADOS: Estado[] = [
  { uf: "AC", capital: "Rio Branco", ddd: "68" },
  { uf: "AL", capital: "Maceió", ddd: "82" },
  { uf: "AP", capital: "Macapá", ddd: "96" },
  { uf: "AM", capital: "Manaus", ddd: "92" },
  { uf: "BA", capital: "Salvador", ddd: "71" },
  { uf: "CE", capital: "Fortaleza", ddd: "85" },
  { uf: "ES", capital: "Vitória", ddd: "27" },
  { uf: "GO", capital: "Goiânia", ddd: "62" },
  { uf: "MA", capital: "São Luís", ddd: "98" },
  { uf: "MT", capital: "Cuiabá", ddd: "65" },
  { uf: "MS", capital: "Campo Grande", ddd: "67" },
  { uf: "MG", capital: "Belo Horizonte", ddd: "31" },
  { uf: "PA", capital: "Belém", ddd: "91" },
  { uf: "PB", capital: "João Pessoa", ddd: "83" },
  { uf: "PR", capital: "Curitiba", ddd: "41" },
  { uf: "PE", capital: "Recife", ddd: "81" },
  { uf: "PI", capital: "Teresina", ddd: "86" },
  { uf: "RJ", capital: "Rio de Janeiro", ddd: "21" },
  { uf: "RN", capital: "Natal", ddd: "84" },
  { uf: "RS", capital: "Porto Alegre", ddd: "51" },
  { uf: "RO", capital: "Porto Velho", ddd: "69" },
  { uf: "RR", capital: "Boa Vista", ddd: "95" },
  { uf: "SC", capital: "Florianópolis", ddd: "48" },
  { uf: "SP", capital: "São Paulo", ddd: "11" },
  { uf: "SE", capital: "Aracaju", ddd: "79" },
  { uf: "TO", capital: "Palmas", ddd: "63" },
];

const NOMES = [
  "Clínica Sorriso+",
  "OdontoCenter",
  "Dr. Renato Dental",
  "Odonto Vila Nova",
  "Sorriso Perfeito",
  "Implantes Prime",
  "Dental Care",
  "Clínica Bem Sorrir",
];

// PRNG determinístico simples
function rnd(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function phoneFor(ddd: string, seed: number) {
  const n = Math.floor(rnd(seed) * 9000 + 1000);
  return `(${ddd}) 9 ${n}-****`;
}

export function ProspeccaoMapWindow() {
  const [idx, setIdx] = useState(23); // começa em SP
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

  const estado = ESTADOS[idx];
  const full = `dentistas em ${estado.capital}`;

  useEffect(() => {
    if (phase === "typing") {
      if (typed.length < full.length) {
        const t = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), 55);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("hold"), 200);
      return () => clearTimeout(t);
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("deleting"), 2400);
      return () => clearTimeout(t);
    }
    if (typed.length > 0) {
      const t = setTimeout(() => setTyped(full.slice(0, typed.length - 1)), 28);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % ESTADOS.length);
      setPhase("typing");
    }, 250);
    return () => clearTimeout(t);
  }, [typed, phase, full]);

  const showResults = phase === "hold" || (phase === "typing" && typed.length === full.length);

  const pins = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        left: `${25 + rnd(idx * 7 + i) * 50}%`,
        top: `${28 + rnd(idx * 13 + i) * 45}%`,
        delay: `${i * 0.12}s`,
      })),
    [idx],
  );

  const leads = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => {
        const n = NOMES[Math.floor(rnd(idx * 3 + i) * NOMES.length)];
        return {
          name: `${n} ${estado.uf}`,
          phone: phoneFor(estado.ddd, idx * 11 + i),
        };
      }),
    [idx, estado.uf, estado.ddd],
  );

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2 shrink-0">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-inner">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="truncate text-sm text-slate-700">{typed}</span>
          <span className="inline-block h-4 w-px shrink-0 bg-[#004DFF] animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 p-3 bg-slate-50/60">
        {/* Mapa estilizado */}
        <div className="col-span-3 relative rounded-2xl overflow-hidden border border-slate-200 bg-[#eef2f7] min-h-[300px]">
          <svg viewBox="0 0 300 320" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="320" fill="#eef3f8" />
            <path d="M-20 90 L320 60" stroke="#fff" strokeWidth="12" />
            <path d="M-20 210 L320 190" stroke="#fff" strokeWidth="10" />
            <path d="M60 -20 L90 340" stroke="#fff" strokeWidth="10" />
            <path d="M200 -20 L230 340" stroke="#fff" strokeWidth="12" />
            <path d="M-20 150 L320 300" stroke="#ffe9b0" strokeWidth="7" />
            <circle cx="45" cy="265" r="42" fill="#d7ebd5" />
            <circle cx="255" cy="120" r="34" fill="#d7ebd5" />
            <rect x="100" y="100" width="70" height="60" rx="8" fill="#e6ebf2" />
            <rect x="120" y="220" width="60" height="50" rx="8" fill="#e6ebf2" />
          </svg>

          {/* Halo de busca */}
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#004DFF]/10 animate-ping" />

          {/* Pins do estado atual */}
          {showResults &&
            pins.map((p, i) => (
              <div
                key={`${idx}-${i}`}
                className="absolute -translate-x-1/2 -translate-y-full float-soft"
                style={{ left: p.left, top: p.top, animationDelay: p.delay }}
              >
                <MapPin className="h-8 w-8 fill-[#004DFF] text-white drop-shadow-[0_6px_10px_rgba(0,77,255,0.45)]" />
              </div>
            ))}

          <div
            key={`badge-${idx}`}
            className="absolute left-3 top-3 animate-fade-in rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm"
          >
            {estado.capital} · {estado.uf} · raio 8 km
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
            <button type="button" className="h-8 w-8 grid place-items-center text-slate-600 hover:bg-slate-50">
              <Plus className="h-4 w-4" />
            </button>
            <span className="h-px bg-slate-200" />
            <button type="button" className="h-8 w-8 grid place-items-center text-slate-600 hover:bg-slate-50">
              <span className="block h-0.5 w-3.5 bg-current rounded" />
            </button>
          </div>
        </div>

        {/* Lista de leads */}
        <div className="col-span-2 space-y-2">
          {leads.map((l, i) => (
            <div
              key={`${idx}-${i}`}
              className="flex animate-fade-in items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:border-[#004DFF]/40 hover:shadow-md"
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#004DFF]/10 text-[#004DFF]">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">{l.name}</p>
                <p className="truncate text-[11px] text-slate-400">{l.phone}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-100">
                novo
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProspeccaoMapWindow;
