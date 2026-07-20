import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { toast } from "sonner";

interface MapLead {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
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

  const saveAsLead = async (lead: MapLead) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload: any = {
        name: lead.name,
        phone: lead.phone || "",
        source: "google_maps",
        status: "new",
        notes: [lead.address, lead.website, lead.category].filter(Boolean).join(" • "),
        user_id: authData?.user?.id,
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
              <StatCard color="from-blue-500/10 to-blue-500/5" icon={<Building2 className="w-5 h-5 text-blue-500" />} value="1.250.000+" label="Empresas encontradas" />
              <StatCard color="from-cyan-500/10 to-cyan-500/5" icon={<Phone className="w-5 h-5 text-cyan-500" />} value="980.000+" label="Telefones capturados" />
              <StatCard color="from-purple-500/10 to-purple-500/5" icon={<Globe className="w-5 h-5 text-purple-500" />} value="750.000+" label="Sites encontrados" />
              <StatCard color="from-pink-500/10 to-pink-500/5" icon={<Star className="w-5 h-5 text-pink-500" />} value="450.000+" label="Avaliações coletadas" />
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
            <div className="relative h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              {/* Header overlay */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-white text-sm">Buscas em tempo real</span>
              </div>
              <div className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-semibold">
                {results.length} leads encontrados
              </div>

              {/* Map SVG (Brasil silhueta simplificada) */}
              <svg viewBox="0 0 400 400" className="w-full h-full opacity-30" preserveAspectRatio="xMidYMid meet">
                <path
                  d="M180 60 Q220 55 260 80 Q290 110 300 160 Q320 200 310 250 Q290 310 240 340 Q200 355 160 340 Q110 310 100 260 Q90 200 110 150 Q140 90 180 60 Z"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Pins simulados */}
              {results.slice(0, 20).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                  }}
                />
              ))}

              {/* Progress footer */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur p-4 space-y-2">
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
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {results.map((lead, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-semibold text-sm">{lead.name}</p>
                          {lead.rating && (
                            <span className="flex items-center gap-1 text-xs text-yellow-500">
                              <Star className="w-3 h-3 fill-yellow-500" />
                              {lead.rating}
                            </span>
                          )}
                        </div>
                        {lead.address && (
                          <p className="text-xs text-muted-foreground flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {lead.address}
                          </p>
                        )}
                        {lead.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </p>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs w-full mt-1" onClick={() => saveAsLead(lead)}>
                          Salvar como lead <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button onClick={saveAll} className="w-full">
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
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg shadow-primary/30">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4" />
                  <p className="font-bold">Plano Profissional</p>
                </div>
                <p className="text-xs opacity-90">Acesso completo a tudo</p>
              </div>
              <Button size="sm" variant="secondary">
                Ver planos <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ color, icon, value, label }: { color: string; icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${color} border border-border/50`}>
      <div className="mb-2">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-1">
        <div className="text-primary">{icon}</div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
