import { useState } from "react";
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
  CalendarDays, TrendingUp, Download, Building2,
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="relative container mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur">
              <Eye className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Espionar Anúncios</h1>
              <p className="text-muted-foreground">Descubra o que seus concorrentes estão anunciando na Meta</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            <Badge variant="secondary" className="gap-1"><Facebook className="h-3 w-3" /> Facebook</Badge>
            <Badge variant="secondary" className="gap-1"><Instagram className="h-3 w-3" /> Instagram</Badge>
            <Badge variant="secondary" className="gap-1"><Target className="h-3 w-3" /> Segmentação</Badge>
            <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Criativos</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Search Card */}
        <Card className="p-6 shadow-lg">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="keyword" className="gap-2"><Search className="h-4 w-4" /> Palavra-chave</TabsTrigger>
              <TabsTrigger value="page" className="gap-2"><Building2 className="h-4 w-4" /> Página</TabsTrigger>
            </TabsList>

            <TabsContent value="keyword" className="space-y-4 mt-0">
              <div>
                <Label>O que espionar?</Label>
                <Input
                  placeholder="Ex: emagrecimento, curso de inglês, dropshipping..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="mt-2 h-12"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map(t => (
                  <Badge key={t} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => setQuery(t)}>
                    {t}
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="page" className="space-y-4 mt-0">
              <div>
                <Label>ID da página do Facebook</Label>
                <Input
                  placeholder="Ex: 123456789012345"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="mt-2 h-12"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Encontre em: facebook.com/[página] → Sobre → ID da página
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div>
              <Label>País</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
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
              <Label>Plataforma</Label>
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
              <Label>Quantidade: {quantity}</Label>
              <Slider min={10} max={200} step={10} value={[quantity]} onValueChange={([v]) => setQuantity(v)} className="mt-4" />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading} size="lg" className="w-full mt-6 h-12 text-base">
            {loading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Analisando anúncios...</> : <><Zap className="h-5 w-5 mr-2" /> Espionar agora</>}
          </Button>
        </Card>

        {/* Results */}
        {ads.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{ads.length} anúncios encontrados</h2>
              </div>
              <Button variant="outline" onClick={exportCSV} className="gap-2">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad, i) => {
                const media = ad.videos?.[0] || ad.images?.[0];
                const isVideo = !!ad.videos?.[0];
                const days = daysRunning(ad.start_date, ad.end_date);
                return (
                  <Card key={ad.ad_archive_id || i} className="overflow-hidden hover:shadow-xl transition-shadow flex flex-col group">
                    {/* Page header */}
                    <div className="flex items-center gap-3 p-4 border-b">
                      {ad.page_profile_pic ? (
                        <img src={ad.page_profile_pic} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{ad.page_name || "Página"}</p>
                        <p className="text-xs text-muted-foreground">Patrocinado</p>
                      </div>
                      {ad.is_active && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>}
                    </div>

                    {/* Body text */}
                    {ad.body && (
                      <div className="p-4 text-sm whitespace-pre-wrap line-clamp-4 break-words">{ad.body}</div>
                    )}

                    {/* Media */}
                    {media && (
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        {isVideo ? (
                          <>
                            <video src={media} className="w-full h-full object-cover" controls preload="metadata" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1"><PlayCircle className="h-4 w-4" /></div>
                          </>
                        ) : (
                          <img src={media} alt="" className="w-full h-full object-cover" loading="lazy" />
                        )}
                        {(ad.images?.length || 0) > 1 && (
                          <Badge className="absolute top-2 right-2 gap-1"><ImageIcon className="h-3 w-3" /> {ad.images?.length}</Badge>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    {(ad.cta_text || ad.link_url) && (
                      <div className="p-3 bg-muted/40 border-t flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground truncate">{ad.link_url}</p>
                        </div>
                        {ad.cta_text && <Button size="sm" variant="secondary" className="shrink-0">{ad.cta_text}</Button>}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="p-3 border-t space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Iniciado em {formatDate(ad.start_date)} {days && `· ${days} dias`}</div>
                      {Array.isArray(ad.platforms) && ad.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {ad.platforms.map(p => <Badge key={p} variant="outline" className="text-[10px] py-0">{p}</Badge>)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-3 border-t mt-auto flex gap-2">
                      <Button size="sm" className="flex-1 gap-1" onClick={() => setSelectedAd(ad)}>
                        <Sparkles className="h-3 w-3" /> Analisar & Reutilizar
                      </Button>
                      {ad.ad_library_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={ad.ad_library_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {!loading && ads.length === 0 && (
          <Card className="p-12 text-center border-dashed">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Digite uma palavra-chave ou ID de página e clique em espionar</p>
          </Card>
        )}
      </div>

      <AdDetailDialog ad={selectedAd} open={!!selectedAd} onOpenChange={(o) => !o && setSelectedAd(null)} />
    </div>
  );
}
      </div>
    </div>
  );
}
