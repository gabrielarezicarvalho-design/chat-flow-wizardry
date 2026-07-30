import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Building2, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Estado = { uf: string; capital: string; ddd: string; lat: number; lng: number };

// 26 estados brasileiros (capitais + DDD + coordenadas)
const ESTADOS: Estado[] = [
  { uf: "AC", capital: "Rio Branco", ddd: "68", lat: -9.9754, lng: -67.8249 },
  { uf: "AL", capital: "Maceió", ddd: "82", lat: -9.6498, lng: -35.7089 },
  { uf: "AP", capital: "Macapá", ddd: "96", lat: 0.0349, lng: -51.0694 },
  { uf: "AM", capital: "Manaus", ddd: "92", lat: -3.119, lng: -60.0217 },
  { uf: "BA", capital: "Salvador", ddd: "71", lat: -12.9777, lng: -38.5016 },
  { uf: "CE", capital: "Fortaleza", ddd: "85", lat: -3.7319, lng: -38.5267 },
  { uf: "ES", capital: "Vitória", ddd: "27", lat: -20.3155, lng: -40.3128 },
  { uf: "GO", capital: "Goiânia", ddd: "62", lat: -16.6869, lng: -49.2648 },
  { uf: "MA", capital: "São Luís", ddd: "98", lat: -2.5307, lng: -44.3068 },
  { uf: "MT", capital: "Cuiabá", ddd: "65", lat: -15.601, lng: -56.0974 },
  { uf: "MS", capital: "Campo Grande", ddd: "67", lat: -20.4697, lng: -54.6201 },
  { uf: "MG", capital: "Belo Horizonte", ddd: "31", lat: -19.9167, lng: -43.9345 },
  { uf: "PA", capital: "Belém", ddd: "91", lat: -1.4558, lng: -48.5039 },
  { uf: "PB", capital: "João Pessoa", ddd: "83", lat: -7.1195, lng: -34.845 },
  { uf: "PR", capital: "Curitiba", ddd: "41", lat: -25.4284, lng: -49.2733 },
  { uf: "PE", capital: "Recife", ddd: "81", lat: -8.0476, lng: -34.877 },
  { uf: "PI", capital: "Teresina", ddd: "86", lat: -5.0892, lng: -42.8019 },
  { uf: "RJ", capital: "Rio de Janeiro", ddd: "21", lat: -22.9068, lng: -43.1729 },
  { uf: "RN", capital: "Natal", ddd: "84", lat: -5.7945, lng: -35.211 },
  { uf: "RS", capital: "Porto Alegre", ddd: "51", lat: -30.0346, lng: -51.2177 },
  { uf: "RO", capital: "Porto Velho", ddd: "69", lat: -8.7612, lng: -63.9004 },
  { uf: "RR", capital: "Boa Vista", ddd: "95", lat: 2.8235, lng: -60.6758 },
  { uf: "SC", capital: "Florianópolis", ddd: "48", lat: -27.5954, lng: -48.548 },
  { uf: "SP", capital: "São Paulo", ddd: "11", lat: -23.5505, lng: -46.6333 },
  { uf: "SE", capital: "Aracaju", ddd: "79", lat: -10.9472, lng: -37.0731 },
  { uf: "TO", capital: "Palmas", ddd: "63", lat: -10.1689, lng: -48.3317 },
];

type Lead = {
  name: string;
  address?: string;
  rating?: number | null;
  reviews?: number | null;
  lat?: number;
  lng?: number;
};

const BLUE_PIN =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <g filter="none">
        <path d="M18 2C10.3 2 4 8.3 4 16c0 10.5 12.1 25.4 13 26.5.5.6 1.5.6 2 0C19.9 41.4 32 26.5 32 16 32 8.3 25.7 2 18 2z" fill="#004DFF" stroke="#ffffff" stroke-width="3"/>
        <circle cx="18" cy="16" r="5" fill="#ffffff"/>
      </g>
    </svg>`,
  );

let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps browser key ausente"));

  mapsPromise = new Promise<void>((resolve, reject) => {
    (window as any).__nextproMapsReady = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__nextproMapsReady${
      channel ? `&channel=${channel}` : ""
    }`;
    s.async = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

const NICHOS = [
  { plural: "dentistas", singular: "Dentista" },
  { plural: "academias", singular: "Academia" },
  { plural: "restaurantes", singular: "Restaurante" },
  { plural: "salões de beleza", singular: "Salão de beleza" },
  { plural: "pet shops", singular: "Pet shop" },
  { plural: "clínicas de estética", singular: "Clínica de estética" },
  { plural: "oficinas mecânicas", singular: "Oficina mecânica" },
  { plural: "padarias", singular: "Padaria" },
  { plural: "imobiliárias", singular: "Imobiliária" },
  { plural: "advogados", singular: "Advogado" },
  { plural: "barbearias", singular: "Barbearia" },
  { plural: "escolas de idiomas", singular: "Escola de idiomas" },
];

export function ProspeccaoMapWindow({
  onLeads,
}: {
  onLeads?: (leads: { name: string; segment: string; city: string }[]) => void;
} = {}) {
  const [idx, setIdx] = useState(23); // começa em SP
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const estado = ESTADOS[idx];
  const nicho = NICHOS[idx % NICHOS.length];
  const full = `${nicho.plural} em ${estado.capital}`;

  // Carrega o mapa real uma única vez
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: ESTADOS[23].lat, lng: ESTADOS[23].lng },
          zoom: 12,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        setMapReady(true);
      })
      .catch((e) => console.warn("[ProspeccaoMapWindow]", e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Efeito de digitação + ciclo de estados
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
      const t = setTimeout(() => setPhase("deleting"), 5200);
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

  // Busca real de empresas ao terminar de digitar
  useEffect(() => {
    if (phase !== "hold") return;
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("landing-maps-search", { body: { query: nicho.plural, city: estado.capital } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        const next: Lead[] = Array.isArray(data?.leads) ? data.leads : [];
        setLeads(next);
        onLeads?.(
          next.slice(0, 3).map((l) => ({
            name: l.name,
            segment: nicho.singular,
            city: estado.capital,
          })),
        );
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn("[landing-maps-search]", e?.message ?? e);
          setLeads([]);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [phase, estado.capital]);

  // Reposiciona o mapa e desenha os pins azuis
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const google = (window as any).google;
    const map = mapRef.current;

    map.panTo({ lat: estado.lat, lng: estado.lng });

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const pts = leads.filter((l) => typeof l.lat === "number" && typeof l.lng === "number");
    pts.forEach((l, i) => {
      const marker = new google.maps.Marker({
        position: { lat: l.lat as number, lng: l.lng as number },
        map,
        title: l.name,
        icon: {
          url: BLUE_PIN,
          scaledSize: new google.maps.Size(30, 38),
          anchor: new google.maps.Point(15, 38),
        },
        animation: google.maps.Animation.DROP,
        zIndex: 10 + i,
      });
      markersRef.current.push(marker);
    });

    if (pts.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      pts.forEach((l) => bounds.extend({ lat: l.lat as number, lng: l.lng as number }));
      map.fitBounds(bounds, 60);
    }
  }, [leads, mapReady, estado.lat, estado.lng]);

  const zoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 12) + delta);
  };

  const displayLeads = useMemo(() => leads.slice(0, 6), [leads]);

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
          {loading && <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-[#004DFF]" />}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 p-3 bg-slate-50/60">
        {/* Mapa real */}
        <div className="col-span-3 relative rounded-2xl overflow-hidden border border-slate-200 bg-[#eef2f7] min-h-[300px]">
          <div ref={containerRef} className="absolute inset-0" />

          {!mapReady && (
            <div className="absolute inset-0 grid place-items-center text-xs text-slate-400">
              carregando mapa…
            </div>
          )}

          <div
            key={`badge-${idx}`}
            className="pointer-events-none absolute left-3 top-3 animate-fade-in rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm"
          >
            {estado.capital} · {estado.uf} · {displayLeads.length} encontrados
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
            <button
              type="button"
              aria-label="Aproximar"
              onClick={() => zoom(1)}
              className="h-8 w-8 grid place-items-center text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="h-px bg-slate-200" />
            <button
              type="button"
              aria-label="Afastar"
              onClick={() => zoom(-1)}
              className="h-8 w-8 grid place-items-center text-slate-600 hover:bg-slate-50"
            >
              <span className="block h-0.5 w-3.5 bg-current rounded" />
            </button>
          </div>
        </div>

        {/* Lista de leads reais */}
        <div className="col-span-2 space-y-2">
          {displayLeads.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="h-[52px] animate-pulse rounded-2xl bg-slate-200/60" />
            ))}

          {displayLeads.map((l, i) => (
            <div
              key={`${idx}-${l.name}-${i}`}
              className="flex animate-fade-in items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:border-[#004DFF]/40 hover:shadow-md"
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#004DFF]/10 text-[#004DFF]">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">{l.name}</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-slate-400">
                  {l.rating ? (
                    <>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {l.rating.toFixed(1)} · {l.reviews ?? 0} avaliações
                    </>
                  ) : (
                    l.address
                  )}
                </p>
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
