import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdDetailDialog } from "@/components/facebook-ads/AdDetailDialog";
import {
  Eye, Search, Loader2, ExternalLink, Facebook, Instagram,
  Sparkles, Target, Zap, PlayCircle, Image as ImageIcon,
  CalendarDays, TrendingUp, Download, Building2, Radar, Flame,
  Globe2, Filter,
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
  { code: "BR", label: "Brasil" }, { code: "US", label: "EUA" },
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
    return { active, withVideo, uniquePages };
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
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/40">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative container mx-auto px-6 py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4 gap-1.5 backdrop-blur bg-background/60 border-border/60">
                <Radar className="h-3 w-3 text-primary" />
                Inteligência competitiva em tempo real
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                Espionar Anúncios
              </h1>
              <p className="text-muted-foreground mt-3 text-lg">
                Descubra criativos vencedores, ofertas e copies que seus concorrentes estão rodando na Meta.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3 backdrop-blur bg-background/40"><Facebook className="h-3.5 w-3.5" /> Facebook</Badge>
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3 backdrop-blur bg-background/40"><Instagram className="h-3.5 w-3.5" /> Instagram</Badge>
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3 backdrop-blur bg-background/40"><Target className="h-3.5 w-3.5" /> Segmentação</Badge>
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3 backdrop-blur bg-background/40"><Sparkles className="h-3.5 w-3.5" /> Criativos IA</Badge>
              </div>
            </div>

            <div className="hidden md:flex relative">
              <div className="relative h-32 w-32 rounded-3xl bg-gradient-to-br from-primary to-primary-dark shadow-2xl shadow-primary/40 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
                <Eye className="h-16 w-16 text-primary-foreground" strokeWidth={1.5} />
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-success animate-pulse ring-4 ring-background" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-6 -mt-6 relative">
        {/* Search Card */}
        <Card className="p-6 md:p-8 shadow-xl shadow-primary/5 border-border/60 backdrop-blur-sm bg-card/95">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-11 p-1">
              <TabsTrigger value="keyword" className="gap-2 h-full"><Search className="h-4 w-4" /> Palavra-chave</TabsTrigger>
              <TabsTrigger value="page" className="gap-2 h-full"><Building2 className="h-4 w-4" /> Página</TabsTrigger>
            </TabsList>

            <TabsContent value="keyword" className="space-y-4 mt-0">
              <div>
                <Label className="text-sm font-medium">O que você quer espionar?</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Ex: emagrecimento, curso de inglês, dropshipping..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="h-14 pl-12 text-base"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Flame className="h-3 w-3" /> Nichos em alta
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map(t => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="cursor-pointer transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5"
                      onClick={() => setQuery(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="page" className="space-y-4 mt-0">
              <div>
                <Label className="text-sm font-medium">ID da página do Facebook</Label>
                <div className="relative mt-2">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="h-14 pl-12 text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Encontre em: facebook.com/[página] → Sobre → ID da página
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Filters */}
          <div className="mt-6 p-4 rounded-xl bg-muted/40 border border-border/40">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Filtros avançados
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Globe2 className="h-3 w-3" /> País</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
                <Select value={activeStatus} onValueChange={setActiveStatus}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Plataforma</Label>
                <Select value={platform || "all"} onValueChange={(v) => setPlatform(v === "all" ? "" : v)}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="messenger">Messenger</SelectItem>
                    <SelectItem value="audience_network">Audience Network</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quantidade</Label>
                  <span className="text-sm font-semibold text-primary">{quantity}</span>
                </div>
                <Slider min={10} max={200} step={10} value={[quantity]} onValueChange={([v]) => setQuantity(v)} className="mt-4" />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={loading}
            size="lg"
            className="w-full mt-6 h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 shadow-lg shadow-primary/25"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Analisando anúncios...</>
            ) : (
              <><Zap className="h-5 w-5 mr-2" /> Espionar agora</>
            )}
          </Button>
        </Card>

        {/* Stats bar */}
        {ads.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 border-border/60 bg-gradient-to-br from-card to-primary/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{ads.length}</p>
                  <p className="text-xs text-muted-foreground">Anúncios</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success/10"><Zap className="h-5 w-5 text-success" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-warning/10"><PlayCircle className="h-5 w-5 text-warning" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.withVideo}</p>
                  <p className="text-xs text-muted-foreground">Com vídeo</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.uniquePages}</p>
                  <p className="text-xs text-muted-foreground">Páginas</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Results */}
        {ads.length > 0 && (
          <>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-primary-dark" />
                <h2 className="text-xl font-semibold">Criativos encontrados</h2>
              </div>
              <Button variant="outline" onClick={exportCSV} className="gap-2">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ads.map((ad, i) => {
                const media = ad.videos?.[0] || ad.images?.[0];
                const isVideo = !!ad.videos?.[0];
                const days = daysRunning(ad.start_date, ad.end_date);
                return (
                  <Card
                    key={ad.ad_archive_id || i}
                    className="overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 flex flex-col group border-border/60"
                  >
                    {/* Page header */}
                    <div className="flex items-center gap-3 p-4 border-b border-border/60">
                      {ad.page_profile_pic ? (
                        <img src={ad.page_profile_pic} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-border" />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-border">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{ad.page_name || "Página"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/60" />
                          Patrocinado
                        </p>
                      </div>
                      {ad.is_active && (
                        <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20 gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                          Ativo
                        </Badge>
                      )}
                    </div>

                    {/* Body text */}
                    {ad.body && (
                      <div className="p-4 text-sm whitespace-pre-wrap line-clamp-4 break-words text-foreground/90 leading-relaxed">
                        {ad.body}
                      </div>
                    )}

                    {/* Media */}
                    {media && (
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        {isVideo ? (
                          <>
                            <video src={media} className="w-full h-full object-cover" controls preload="metadata" />
                            <div className="absolute top-2 left-2 bg-background/80 backdrop-blur text-foreground rounded-full px-2 py-1 flex items-center gap-1 text-xs font-medium">
                              <PlayCircle className="h-3.5 w-3.5" /> Vídeo
                            </div>
                          </>
                        ) : (
                          <img src={media} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        )}
                        {(ad.images?.length || 0) > 1 && (
                          <Badge className="absolute top-2 right-2 gap-1 bg-background/80 backdrop-blur text-foreground border-border">
                            <ImageIcon className="h-3 w-3" /> {ad.images?.length}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    {(ad.cta_text || ad.link_url) && (
                      <div className="p-3 bg-muted/40 border-t border-border/60 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Link patrocinado</p>
                          <p className="text-xs text-foreground/80 truncate">{ad.link_url}</p>
                        </div>
                        {ad.cta_text && (
                          <Button size="sm" variant="secondary" className="shrink-0 font-semibold">
                            {ad.cta_text}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="p-3 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>Desde {formatDate(ad.start_date)}</span>
                        {days && (
                          <Badge variant="outline" className="ml-auto text-[10px] py-0 h-4 font-medium">
                            {days}d rodando
                          </Badge>
                        )}
                      </div>
                      {Array.isArray(ad.platforms) && ad.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ad.platforms.map(p => (
                            <Badge key={p} variant="outline" className="text-[10px] py-0 h-4 capitalize">{p}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-3 border-t border-border/60 mt-auto flex gap-2 bg-muted/20">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90"
                        onClick={() => setSelectedAd(ad)}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Analisar & Reutilizar
                      </Button>
                      {ad.ad_library_url && (
                        <Button size="sm" variant="outline" asChild>
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
          </>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border/60 animate-pulse">
                <div className="flex items-center gap-3 p-4 border-b border-border/60">
                  <div className="h-11 w-11 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-2 w-1/3 rounded bg-muted" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                </div>
                <div className="aspect-square bg-muted" />
              </Card>
            ))}
          </div>
        )}

        {!loading && ads.length === 0 && (
          <Card className="p-16 text-center border-dashed border-2 bg-gradient-to-br from-card to-primary/5">
            <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Radar className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pronto para espionar a concorrência?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Digite uma palavra-chave ou ID de página acima e descubra em segundos quais criativos estão bombando na Meta.
            </p>
          </Card>
        )}
      </div>

      <AdDetailDialog ad={selectedAd} open={!!selectedAd} onOpenChange={(o) => !o && setSelectedAd(null)} />
    </div>
  );
}
