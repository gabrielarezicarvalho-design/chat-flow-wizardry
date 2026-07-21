import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdDetailDialog } from "@/components/facebook-ads/AdDetailDialog";
import {
  Eye, Search, Loader2, ExternalLink, Facebook, Instagram,
  Sparkles, Zap, PlayCircle, Image as ImageIcon,
  CalendarDays, TrendingUp, Download, Building2, Radar,
  Globe2, ShieldCheck, LineChart, Layers, ChevronRight,
} from "lucide-react";

interface FacebookAd {
  ad_archive_id?: string;
  page_id?: string;
  page_name?: string;
  page_profile_pic?: string;
  page_categories?: string[];
  page_likes?: number;
  body?: string;
  title?: string;
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  display_format?: string;
  images?: string[];
  videos?: string[];
  start_date?: string | number;
  end_date?: string | number;
  is_active?: boolean;
  platforms?: string[] | string;
  ad_library_url?: string;
}

type Mode = "keyword" | "page";

const POPULAR = [
  "Emagrecimento", "Curso Online", "E-commerce", "Infoproduto",
  "Estética", "Marketing Digital", "Dropshipping", "Consultoria",
];

const COUNTRIES = [
  { code: "BR", label: "Brasil" }, { code: "US", label: "Estados Unidos" },
  { code: "PT", label: "Portugal" }, { code: "ES", label: "Espanha" },
  { code: "MX", label: "México" }, { code: "AR", label: "Argentina" },
  { code: "ALL", label: "Todos os países" },
];

function formatDate(d?: string | number) {
  if (!d) return "—";
  try {
    const date = typeof d === "number" ? new Date(d * 1000) : new Date(d);
    return date.toLocaleDateString("pt-BR");
  } catch { return String(d); }
}

function daysRunning(start?: string | number, end?: string | number) {
  if (!start) return null;
  const s = typeof start === "number" ? new Date(start * 1000) : new Date(start);
  const e = end ? (typeof end === "number" ? new Date(end * 1000) : new Date(end)) : new Date();
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function FacebookAdsSpy() {
  const [mode, setMode] = useState<Mode>("keyword");
  const [query, setQuery] = useState("");
  const [pageId, setPageId] = useState("");
  const [country, setCountry] = useState("BR");
  const [activeStatus, setActiveStatus] = useState("active");
  const [platform, setPlatform] = useState("");
  const [quantity, setQuantity] = useState(30);
  const [loading, setLoading] = useState(false);
  const [ads, setAds] = useState<FacebookAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<FacebookAd | null>(null);

  const stats = useMemo(() => {
    const active = ads.filter(a => a.is_active).length;
    const withVideo = ads.filter(a => a.videos?.length).length;
    const uniquePages = new Set(ads.map(a => a.page_id).filter(Boolean)).size;
    const avgDays = ads.length
      ? Math.round(ads.reduce((s, a) => s + (daysRunning(a.start_date, a.end_date) || 0), 0) / ads.length)
      : 0;
    return { active, withVideo, uniquePages, avgDays };
  }, [ads]);

  const handleSearch = async () => {
    const input = mode === "keyword" ? query : pageId;
    if (!input.trim()) {
      toast.error(mode === "keyword" ? "Digite uma palavra-chave" : "Digite o ID da página");
      return;
    }
    setLoading(true);
    setAds([]);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-ads-spy", {
        body: {
          query: mode === "keyword" ? query.trim() : undefined,
          pageId: mode === "page" ? pageId.trim() : undefined,
          country: country === "ALL" ? "" : country,
          activeStatus,
          platform,
          quantity,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: FacebookAd[] = data?.ads || [];
      setAds(list);
      if (!list.length) toast.info("Nenhum anúncio encontrado. Tente outros filtros.");
      else toast.success(`${list.length} anúncios encontrados!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao buscar anúncios");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!ads.length) return;
    const headers = ["Página", "Título", "Texto", "CTA", "Link", "Início", "Fim", "Plataformas", "Ativo", "Ad Library"];
    const rows = ads.map(a => [
      a.page_name || "", a.title || "", (a.body || "").replace(/\n/g, " "),
      a.cta_text || "", a.link_url || "",
      formatDate(a.start_date), formatDate(a.end_date),
      Array.isArray(a.platforms) ? a.platforms.join("|") : (a.platforms || ""),
      a.is_active ? "Sim" : "Não", a.ad_library_url || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `facebook-ads-${Date.now()}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Executive header — dark, corporate */}
      <header className="relative overflow-hidden bg-[hsl(222_47%_11%)] text-white border-b border-white/5">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 right-0 w-[520px] h-[520px] rounded-full bg-primary/25 blur-[120px]" />

        <div className="relative container mx-auto px-8 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/50 mb-6">
            <span>Next Pro</span>
            <ChevronRight className="h-3 w-3" />
            <span>Inteligência</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80 font-medium">Espionagem de Anúncios</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-white/80 uppercase tracking-wider mb-5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Meta Ad Library · Dados oficiais
              </div>
              <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
                Central de Inteligência<br />
                <span className="text-white/60">Competitiva</span>
              </h1>
              <p className="text-white/60 mt-4 text-base max-w-xl leading-relaxed">
                Monitore criativos, ofertas e estratégias de campanha da concorrência em tempo real.
                Extraia insights acionáveis diretamente da Biblioteca de Anúncios da Meta.
              </p>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10 min-w-[420px]">
              {[
                { label: "Fontes", value: "2", sub: "Facebook · Instagram" },
                { label: "Países", value: "40+", sub: "Cobertura global" },
                { label: "Latência", value: "< 2min", sub: "Dados atualizados" },
              ].map((k) => (
                <div key={k.label} className="bg-[hsl(222_47%_11%)] p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{k.label}</p>
                  <p className="text-2xl font-semibold mt-1">{k.value}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 py-8 space-y-6">
        {/* Search console */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Radar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Nova pesquisa</h2>
                <p className="text-xs text-muted-foreground">Configure os parâmetros para iniciar a análise</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 font-normal">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              API operacional
            </Badge>
          </div>

          <div className="p-6 space-y-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full max-w-md grid-cols-2 h-10">
                <TabsTrigger value="keyword" className="gap-2 text-sm"><Search className="h-3.5 w-3.5" /> Por palavra-chave</TabsTrigger>
                <TabsTrigger value="page" className="gap-2 text-sm"><Building2 className="h-3.5 w-3.5" /> Por página</TabsTrigger>
              </TabsList>

              <TabsContent value="keyword" className="space-y-5 mt-6">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Termo de pesquisa</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Digite um nicho, produto ou marca..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-12 pl-11 text-sm bg-background border-input"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sugestões de nichos populares</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR.map(t => (
                      <button
                        key={t}
                        onClick={() => setQuery(t)}
                        className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted hover:border-primary/40 transition-colors text-foreground/80 hover:text-foreground"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="page" className="space-y-5 mt-6">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID da página</Label>
                  <div className="relative mt-2">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Ex: 123456789012345"
                      value={pageId}
                      onChange={(e) => setPageId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-12 pl-11 text-sm bg-background border-input"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Localize em: <span className="font-mono text-foreground/70">facebook.com/[página] → Sobre → ID da página</span>
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Filters — corporate grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parâmetros da consulta</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Globe2 className="h-3 w-3" /> Região</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status do anúncio</Label>
                  <Select value={activeStatus} onValueChange={setActiveStatus}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Somente ativos</SelectItem>
                      <SelectItem value="inactive">Somente inativos</SelectItem>
                      <SelectItem value="all">Todos os status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Plataforma</Label>
                  <Select value={platform || "all"} onValueChange={(v) => setPlatform(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas plataformas</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="messenger">Messenger</SelectItem>
                      <SelectItem value="audience_network">Audience Network</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label className="text-xs text-muted-foreground">Volume de resultados</Label>
                    <span className="text-sm font-semibold tabular-nums">{quantity}</span>
                  </div>
                  <div className="h-10 flex items-center">
                    <Slider min={10} max={200} step={10} value={[quantity]} onValueChange={([v]) => setQuantity(v)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/60 bg-muted/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" /> Facebook</div>
              <div className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" /> Instagram</div>
              <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Análise IA inclusa</div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="h-11 px-6 font-medium gap-2 min-w-[180px]"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
              ) : (
                <><Zap className="h-4 w-4" /> Executar pesquisa</>
              )}
            </Button>
          </div>
        </Card>

        {/* Metrics dashboard */}
        {ads.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total analisado", value: ads.length, icon: Layers, tone: "primary" },
              { label: "Campanhas ativas", value: stats.active, icon: TrendingUp, tone: "success", suffix: `${Math.round((stats.active / ads.length) * 100)}%` },
              { label: "Criativos em vídeo", value: stats.withVideo, icon: PlayCircle, tone: "warning" },
              { label: "Anunciantes únicos", value: stats.uniquePages, icon: Building2, tone: "primary", suffix: `${stats.avgDays}d médio` },
            ].map((k) => (
              <Card key={k.label} className="p-5 border-border/60 hover:border-border transition-colors">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <k.icon className={`h-4 w-4 text-${k.tone}`} />
                </div>
                <p className="text-3xl font-semibold mt-3 tabular-nums">{k.value.toLocaleString("pt-BR")}</p>
                {k.suffix && <p className="text-xs text-muted-foreground mt-1">{k.suffix}</p>}
              </Card>
            ))}
          </div>
        )}

        {/* Results header */}
        {ads.length > 0 && (
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              <LineChart className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold">Resultados da análise</h2>
                <p className="text-xs text-muted-foreground">Exibindo {ads.length} criativos ordenados por relevância</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-3.5 w-3.5" /> Exportar relatório
            </Button>
          </div>
        )}

        {/* Cards grid */}
        {ads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ads.map((ad, i) => {
              const media = ad.videos?.[0] || ad.images?.[0];
              const isVideo = !!ad.videos?.[0];
              const days = daysRunning(ad.start_date, ad.end_date);
              return (
                <Card
                  key={ad.ad_archive_id || i}
                  className="overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200 flex flex-col group border-border/60"
                >
                  <div className="flex items-center gap-3 p-4 border-b border-border/60">
                    {ad.page_profile_pic ? (
                      <img src={ad.page_profile_pic} alt="" className="h-10 w-10 rounded-md object-cover ring-1 ring-border" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center ring-1 ring-border">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{ad.page_name || "Página"}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Anunciante verificado</p>
                    </div>
                    {ad.is_active && (
                      <Badge variant="outline" className="border-success/40 text-success bg-success/5 gap-1 font-normal">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Ativo
                      </Badge>
                    )}
                  </div>

                  {ad.body && (
                    <div className="p-4 text-sm line-clamp-4 break-words text-foreground/85 leading-relaxed whitespace-pre-wrap">
                      {ad.body}
                    </div>
                  )}

                  {media && (
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {isVideo ? (
                        <>
                          <video src={media} className="w-full h-full object-cover" controls preload="metadata" />
                          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-foreground rounded-md px-2 py-1 flex items-center gap-1 text-[11px] font-medium border border-border/50">
                            <PlayCircle className="h-3 w-3" /> Vídeo
                          </div>
                        </>
                      ) : (
                        <img src={media} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                      )}
                      {(ad.images?.length || 0) > 1 && (
                        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm text-foreground rounded-md px-2 py-1 flex items-center gap-1 text-[11px] font-medium border border-border/50">
                          <ImageIcon className="h-3 w-3" /> {ad.images?.length}
                        </div>
                      )}
                    </div>
                  )}

                  {(ad.cta_text || ad.link_url) && (
                    <div className="p-3 bg-muted/40 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Destino</p>
                        <p className="text-xs text-foreground/80 truncate font-mono">{ad.link_url || "—"}</p>
                      </div>
                      {ad.cta_text && (
                        <Button size="sm" variant="secondary" className="shrink-0 h-8 font-medium">
                          {ad.cta_text}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="px-4 py-3 border-t border-border/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Início {formatDate(ad.start_date)}</span>
                      {days && (
                        <span className="font-semibold text-foreground tabular-nums">
                          {days}d <span className="text-muted-foreground font-normal">em veiculação</span>
                        </span>
                      )}
                    </div>
                    {Array.isArray(ad.platforms) && ad.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ad.platforms.map(p => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-border/60 mt-auto flex gap-2 bg-background">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 h-9 font-medium"
                      onClick={() => setSelectedAd(ad)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Analisar criativo
                    </Button>
                    {ad.ad_library_url && (
                      <Button size="sm" variant="outline" className="h-9" asChild>
                        <a href={ad.ad_library_url} target="_blank" rel="noreferrer" aria-label="Abrir na Biblioteca de Anúncios">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border/60 animate-pulse">
                <div className="flex items-center gap-3 p-4 border-b border-border/60">
                  <div className="h-10 w-10 rounded-md bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-2 w-1/3 rounded bg-muted" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                </div>
                <div className="aspect-[4/3] bg-muted" />
              </Card>
            ))}
          </div>
        )}

        {!loading && ads.length === 0 && (
          <Card className="border-border/60 bg-gradient-to-br from-card via-card to-muted/30">
            <div className="grid md:grid-cols-2 gap-8 p-10">
              <div className="flex flex-col justify-center">
                <div className="inline-flex w-fit items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-4">
                  <Eye className="h-3.5 w-3.5" /> Módulo pronto para uso
                </div>
                <h3 className="text-2xl font-semibold mb-3">Inicie sua primeira análise competitiva</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Configure os parâmetros no painel acima e obtenha em segundos um relatório completo com os
                  criativos, copies e ofertas que os concorrentes estão veiculando na Meta.
                </p>
                <div className="space-y-2.5">
                  {[
                    "Análise de criativos ativos e histórico completo",
                    "Copies, CTAs e páginas de destino",
                    "Duração da veiculação e plataformas",
                    "Extração assistida por IA generativa",
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-foreground/80">
                      <div className="h-4 w-4 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                        <div className="h-1.5 w-1.5 rounded-full bg-success" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative h-56 w-56 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-2xl shadow-primary/30 flex items-center justify-center">
                    <Radar className="h-24 w-24 text-primary-foreground/90" strokeWidth={1.25} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <AdDetailDialog ad={selectedAd} open={!!selectedAd} onOpenChange={(o) => !o && setSelectedAd(null)} />
    </div>
  );
}
