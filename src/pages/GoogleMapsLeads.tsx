import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  Building2,
  Phone,
  Globe,
  Star,
  MapPin,
  Rocket,
  Sparkles,
  Brain,
  SlidersHorizontal,
  Download,
  Headphones,
  Crown,
  ArrowRight,
  CheckCircle2,
  Mail,
  Share2,
  ExternalLink,
  Loader2,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { toast } from "sonner";

import { LiveMap } from "@/components/google-maps-leads/LiveMap";

interface MapLead {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  lat?: number;
  lng?: number;
}

const QUICK_AMOUNTS = [50, 100, 250, 500];

export default function GoogleMapsLeads() {
  const { companyId } = useCompanyId();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [amount, setAmount] = useState(100);
  const [maxMode, setMaxMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Pronto para buscar");
  const [results, setResults] = useState<MapLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
  const [enrichment, setEnrichment] = useState<{
    loading: boolean;
    emails: string[];
    socials: Record<string, string>;
    error?: string;
  }>({ loading: false, emails: [], socials: {} });
  const [enrichCache, setEnrichCache] = useState<Record<string, { emails: string[]; socials: Record<string, string> }>>({});

  useEffect(() => {
    if (!selectedLead) return;
    const website = selectedLead.website;
    if (!website) {
      setEnrichment({ loading: false, emails: [], socials: {}, error: "Sem site para enriquecer" });
      return;
    }
    if (enrichCache[website]) {
      setEnrichment({ loading: false, ...enrichCache[website] });
      return;
    }
    let cancelled = false;
    setEnrichment({ loading: true, emails: [], socials: {} });
    supabase.functions
      .invoke("enrich-lead", { body: { website } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setEnrichment({ loading: false, emails: [], socials: {}, error: "Não foi possível enriquecer" });
          return;
        }
        const result = { emails: data?.emails || [], socials: data?.socials || {} };
        setEnrichCache((c) => ({ ...c, [website]: result }));
        setEnrichment({ loading: false, ...result });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLead, enrichCache]);

  const totalTarget = maxMode ? 1000 : amount;

  const handleSearch = async () => {
    if (!query.trim() || !city.trim()) {
      toast.error("Preencha o que buscar e a cidade");
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(0);
    setStatus("Iniciando busca no Google Maps...");

    try {
      // Chama edge function que faz a busca via Google Places API (New)
      const { data, error } = await supabase.functions.invoke("google-maps-leads", {
        body: { query, city, limit: totalTarget },
      });

      if (error) throw error;

      const leads: MapLead[] = data?.leads || [];

      // Anima progresso
      for (let i = 1; i <= 10; i++) {
        await new Promise((r) => setTimeout(r, 60));
        setProgress(i * 10);
        setStatus(`Coletando ${Math.floor((i / 10) * leads.length)} de ${leads.length}...`);
      }

      setResults(leads);
      setStatus(`${leads.length} leads encontrados`);
      toast.success(`${leads.length} empresas encontradas!`);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "";
      if (msg.includes("connector") || msg.includes("Google Maps")) {
        toast.error("Conecte o Google Maps nas integrações do admin para buscar leads reais.");
      } else {
        toast.error("Erro ao buscar. Conecte o Google Maps ou tente novamente.");
      }
      setStatus("Erro na busca");
    } finally {
      setLoading(false);
    }
  };

  const saveAsLead = async (
    lead: MapLead,
    extra?: { emails?: string[]; socials?: Record<string, string> }
  ) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const cached = lead.website ? enrichCache[lead.website] : undefined;
      const emails = extra?.emails ?? cached?.emails ?? [];
      const socials = extra?.socials ?? cached?.socials ?? {};

      const payload: any = {
        name: lead.name,
        phone: lead.phone || "",
        email: emails[0] || null,
        source: "google_maps",
        status: "new",
        notes: [lead.address, lead.website, lead.category].filter(Boolean).join(" • "),
        user_id: authData?.user?.id,
        custom_fields: {
          website: lead.website || null,
          category: lead.category || null,
          address: lead.address || null,
          rating: lead.rating ?? null,
          emails,
          socials,
        },
      };
      if (companyId) payload.company_id = companyId;

      const { error } = await supabase.from("leads").insert([payload]);
      if (error) throw error;
      toast.success(`${lead.name} salvo em Leads`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar lead");
    }
  };

  const saveAll = async () => {
    if (!results.length) return;
    const toast_id = toast.loading(`Salvando ${results.length} leads...`);
    let ok = 0;
    for (const l of results) {
      try {
        await saveAsLead(l);
        ok++;
      } catch {}
    }
    toast.dismiss(toast_id);
    toast.success(`${ok}/${results.length} leads salvos`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="space-y-6">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6 pt-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-4 py-1.5">
              <Rocket className="w-3.5 h-3.5 mr-2" />
              A plataforma #1 para geração de leads no Google Maps
            </Badge>

            <h1 className="text-5xl md:text-6xl font-bold font-['Space_Grotesk'] leading-tight tracking-tight">
              Encontre <br />
              empresas. <br />
              Gere leads. <br />
              <span className="text-primary">Venda mais!</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md">
              Descubra empresas qualificadas no Google Maps e obtenha contatos valiosos em segundos.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <StatCard color="from-blue-500/10 to-blue-500/5" icon={<Building2 className="w-5 h-5 text-blue-500" />} start={1250000} label="Empresas encontradas" />
              <StatCard color="from-cyan-500/10 to-cyan-500/5" icon={<Phone className="w-5 h-5 text-cyan-500" />} start={980000} label="Telefones capturados" />
              <StatCard color="from-purple-500/10 to-purple-500/5" icon={<Globe className="w-5 h-5 text-purple-500" />} start={750000} label="Sites encontrados" />
              <StatCard color="from-pink-500/10 to-pink-500/5" icon={<Star className="w-5 h-5 text-pink-500" />} start={450000} label="Avaliações coletadas" />
            </div>
          </div>

          {/* Search Card */}
          <Card className="border-primary/20 shadow-2xl shadow-primary/10 bg-card/95 backdrop-blur">
            <CardContent className="p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Buscar Empresas no Google Maps</h2>
                <Sparkles className="w-5 h-5 text-primary ml-auto" />
              </div>

              <div className="space-y-2">
                <Label>O que você busca?</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: Imobiliárias, Dentistas, Academias..."
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cidade / Localização</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo, SP"
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Quantidade de leads</Label>
                  <span className="font-bold text-primary">{maxMode ? "MAX" : amount}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={amount}
                  disabled={maxMode}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-2 accent-primary"
                />
                <div className="flex gap-2">
                  {QUICK_AMOUNTS.map((q) => (
                    <Button
                      key={q}
                      variant={!maxMode && amount === q ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setMaxMode(false);
                        setAmount(q);
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                  <Button
                    variant={maxMode ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMaxMode(true)}
                  >
                    MAX
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={loading}
                size="lg"
                className="w-full h-14 text-base font-bold shadow-lg shadow-primary/30"
              >
                <Rocket className="w-5 h-5 mr-2" />
                {loading ? "BUSCANDO..." : "GERAR LEADS AGORA"}
              </Button>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Rápido</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> Fácil</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> 100% Seguro</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> Resultados reais</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map placeholder */}
          <Card className="lg:col-span-2 overflow-hidden border-primary/10">
            <div className="relative h-[500px] bg-[#e8eef5]">
              {/* Header overlay */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-white text-sm">Buscas em tempo real</span>
              </div>
              <div className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-semibold">
                {results.length} leads encontrados
              </div>

              {/* Google Map real */}
              <LiveMap leads={results} city={city} />

              {/* Progress footer */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur p-4 space-y-2 z-10">
                <div className="flex justify-between text-sm text-white">
                  <span>{status}</span>
                  <span className="text-yellow-400 font-semibold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </div>
          </Card>

          {/* Results list */}
          <Card className="border-primary/10">
            <CardContent className="p-5 space-y-4 h-[500px] flex flex-col">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Leads encontrados</h3>
                <Badge variant="secondary">{results.length}</Badge>
              </div>

              {results.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                  <MapPin className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Faça uma busca para ver os leads aparecerem aqui em tempo real.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
                    {results.map((lead, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedLead(lead)}
                        className="group relative p-4 rounded-xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <p className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors">
                            {lead.name}
                          </p>
                          {lead.rating && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                              <Star className="w-3 h-3 fill-yellow-500" />
                              {lead.rating}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {lead.address && (
                            <p className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary/70" />
                              <span className="line-clamp-2">{lead.address}</span>
                            </p>
                          )}
                          {lead.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary/70" /> {lead.phone}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs w-full font-medium text-primary hover:bg-primary/10 hover:text-primary group/btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveAsLead(lead);
                            }}
                          >
                            Salvar como lead
                            <ArrowRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={saveAll} className="w-full h-11 font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all">
                    <Download className="w-4 h-4 mr-2" />
                    Salvar todos ({results.length})
                  </Button>

                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <FeatureCard icon={<Brain className="w-5 h-5" />} title="Extração inteligente" desc="Dados precisos e atualizados" />
          <FeatureCard icon={<SlidersHorizontal className="w-5 h-5" />} title="Filtros avançados" desc="Encontre exatamente o que precisa" />
          <FeatureCard icon={<Download className="w-5 h-5" />} title="Exportação fácil" desc="Exporte e use onde quiser" />
          <FeatureCard icon={<Headphones className="w-5 h-5" />} title="Suporte humanizado" desc="Estamos aqui pra ajudar" />
          <Card className="group relative overflow-hidden border-0 shadow-lg shadow-primary/30 bg-gradient-to-br from-[hsl(217_91%_55%)] via-[hsl(221_83%_45%)] to-[hsl(224_76%_35%)] text-white transition-all duration-500 hover:shadow-primary/50">
            <div className="absolute -left-1/2 top-0 h-full w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[300%] transition-all duration-1000" />
            <CardContent className="relative p-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 text-white transition-all duration-500 group-hover:bg-white group-hover:text-primary group-hover:shadow-lg group-hover:shadow-white/40 mb-2">
                  <Crown className="w-5 h-5" strokeWidth={2} />
                </div>
                <p className="font-semibold text-sm leading-tight whitespace-nowrap">Plano Profissional</p>
                <p className="text-xs text-white/80 mt-0.5">Acesso completo a tudo</p>
              </div>
              <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold rounded-lg shadow-md flex-shrink-0">
                Ver planos <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>


          </Card>


        </div>
      </div>

      {/* Lead details popup */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          {selectedLead && (
            <div className="p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-left">{selectedLead.name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                {selectedLead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    <a href={`tel:${selectedLead.phone}`} className="text-foreground hover:text-primary transition-colors">
                      {selectedLead.phone}
                    </a>
                  </div>
                )}

                {selectedLead.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {selectedLead.website}
                    </a>
                  </div>
                )}

                {selectedLead.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{selectedLead.address}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Enriquecimento automático
                </div>

                {enrichment.loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Buscando emails e redes sociais no site...
                  </div>
                ) : enrichment.error ? (
                  <p className="text-sm text-muted-foreground">{enrichment.error}</p>
                ) : (
                  <>
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {enrichment.emails.length === 0 ? (
                          <span className="text-muted-foreground">Nenhum email encontrado</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {enrichment.emails.map((e) => (
                              <a key={e} href={`mailto:${e}`} className="text-foreground hover:text-primary transition-colors truncate">
                                {e}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm">
                      <Share2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 flex flex-wrap gap-2">
                        {Object.keys(enrichment.socials).length === 0 ? (
                          <span className="text-muted-foreground">Nenhuma rede social encontrada</span>
                        ) : (
                          Object.entries(enrichment.socials).map(([key, url]) => (
                            <a
                              key={key}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-medium capitalize"
                            >
                              {key === "instagram" && <Instagram className="w-3 h-3" />}
                              {key === "facebook" && <Facebook className="w-3 h-3" />}
                              {key === "linkedin" && <Linkedin className="w-3 h-3" />}
                              {key === "youtube" && <Youtube className="w-3 h-3" />}
                              {!["instagram", "facebook", "linkedin", "youtube"].includes(key) && <ExternalLink className="w-3 h-3" />}
                              {key}
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 font-bold tracking-wide"
                  disabled={enrichment.loading}
                  onClick={async () => {
                    await saveAsLead(selectedLead, {
                      emails: enrichment.emails,
                      socials: enrichment.socials,
                    });
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  SALVAR COMO LEAD
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 font-bold tracking-wide"
                  onClick={() => {
                    const q = encodeURIComponent(`${selectedLead.name} ${selectedLead.address ?? ""}`);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  GOOGLE MAPS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ color, icon, start, label }: { color: string; icon: React.ReactNode; start: number; label: string }) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setValue((v) => v + 10), 30000);
    return () => clearInterval(id);
  }, []);
  const formatted = value.toLocaleString("pt-BR") + "+";
  return (
    <div
      className={`group relative rounded-xl p-4 bg-gradient-to-br ${color} border border-border/50 overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/40`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
      <div className="relative">
        <div className="mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{icon}</div>
        <RollingNumber text={formatted} />
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}

function RollingNumber({ text }: { text: string }) {
  const chars = text.split("");
  // Count digits to compute stagger delay from right to left
  const digitPositions: number[] = [];
  let dIdx = 0;
  for (let i = 0; i < chars.length; i++) {
    digitPositions.push(/\d/.test(chars[i]) ? dIdx++ : -1);
  }
  const totalDigits = dIdx;
  return (
    <p className="text-lg font-bold flex items-center leading-none h-[1.4em] tracking-tight tabular-nums">
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <RollingDigit
            key={i}
            digit={parseInt(ch, 10)}
            delay={(totalDigits - 1 - digitPositions[i]) * 60}
          />
        ) : (
          <span key={i} className="inline-block">{ch}</span>
        )
      )}
    </p>
  );
}

function RollingDigit({ digit, delay }: { digit: number; delay: number }) {
  const prevRef = useRef(digit);
  const [offset, setOffset] = useState(digit); // cumulative offset (can exceed 9)
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevRef.current === digit) return;
    // forward distance modulo 10, min 1 full rotation for spin feel
    const forward = ((digit - (prevRef.current % 10)) + 10) % 10 || 10;
    const newOffset = offset + forward;
    const timer = setTimeout(() => {
      setAnimating(true);
      setOffset(newOffset);
    }, delay);
    prevRef.current = digit;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digit]);

  // After animation ends, snap back (no transition) to equivalent position mod 10
  useEffect(() => {
    if (!animating) return;
    const t = setTimeout(() => {
      setAnimating(false);
      setOffset((o) => o % 10);
    }, 900);
    return () => clearTimeout(t);
  }, [offset, animating]);

  return (
    <span
      className="inline-block overflow-hidden h-[1.2em] leading-[1.2em] align-middle relative"
      style={{ width: "0.62em" }}
    >
      <span
        className="flex flex-col"
        style={{
          transform: `translateY(-${offset * 1.2}em)`,
          transition: animating
            ? "transform 900ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
          filter: animating ? "blur(0.4px)" : "none",
        }}
      >
        {Array.from({ length: offset + 11 }).map((_, n) => (
          <span key={n} className="h-[1.2em] leading-[1.2em] text-center">
            {n % 10}
          </span>
        ))}
      </span>
      {/* fade mask top/bottom for depth */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 25%, transparent 75%, hsl(var(--background)) 100%)",
          opacity: animating ? 0.6 : 0,
          transition: "opacity 200ms",
        }}
      />
    </span>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="group relative overflow-hidden cursor-default border-border/60 transition-all duration-500 hover:border-primary/60">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -left-1/2 top-0 h-full w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[300%] transition-all duration-1000" />
      <CardContent className="relative p-5 space-y-1">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/40">
          {icon}
        </div>
        <p className="font-semibold text-sm pt-1 transition-transform duration-300 group-hover:translate-x-1">{title}</p>
        <p className="text-xs text-muted-foreground transition-transform duration-300 group-hover:translate-x-1">{desc}</p>
      </CardContent>
    </Card>
  );
}
