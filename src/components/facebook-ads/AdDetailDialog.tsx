import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy, Download, Sparkles, Loader2, ExternalLink,
  ChevronLeft, ChevronRight, Building2, PlayCircle,
  Image as ImageIcon, Video, Link as LinkIcon,
} from "lucide-react";

interface AdDetailDialogProps {
  ad: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch {
    window.open(url, "_blank");
  }
}

// Renders markdown-ish text (bold, headings) safely
function RenderMarkdown({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/\n/g, "<br/>");
  return <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function AdDetailDialog({ ad, open, onOpenChange }: AdDetailDialogProps) {
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);

  if (!ad) return null;

  const images: string[] = ad.images || [];
  const videos: string[] = ad.videos || [];
  const totalMedia = images.length + videos.length;
  const currentImage = images[carouselIdx];

  const copyText = async () => {
    await navigator.clipboard.writeText(ad.body || "");
    toast.success("Texto copiado!");
  };

  const copyAll = async () => {
    const full = [
      ad.page_name && `Página: ${ad.page_name}`,
      ad.title && `Título: ${ad.title}`,
      ad.body && `\n${ad.body}`,
      ad.cta_text && `\nCTA: ${ad.cta_text}`,
      ad.link_url && `Link: ${ad.link_url}`,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(full);
    toast.success("Criativo completo copiado!");
  };

  const downloadAll = async () => {
    for (let i = 0; i < images.length; i++) {
      await downloadFile(images[i], `${ad.page_name || "ad"}-img-${i + 1}.jpg`);
    }
    for (let i = 0; i < videos.length; i++) {
      await downloadFile(videos[i], `${ad.page_name || "ad"}-video-${i + 1}.mp4`);
    }
    toast.success(`${totalMedia} arquivo(s) baixados`);
  };

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-ad", { body: { ad } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis || "");
      toast.success("Análise concluída!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao analisar");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-3">
            {ad.page_profile_pic ? (
              <img src={ad.page_profile_pic} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate">{ad.page_name || "Anúncio"}</p>
              <div className="flex gap-2 mt-1">
                {ad.is_active && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Ativo</Badge>}
                {images.length > 0 && <Badge variant="outline" className="text-xs gap-1"><ImageIcon className="h-3 w-3" />{images.length}</Badge>}
                {videos.length > 0 && <Badge variant="outline" className="text-xs gap-1"><Video className="h-3 w-3" />{videos.length}</Badge>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="creative" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 grid grid-cols-3 w-auto">
            <TabsTrigger value="creative">Criativos</TabsTrigger>
            <TabsTrigger value="text">Texto & CTA</TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1"><Sparkles className="h-3 w-3" /> Análise IA</TabsTrigger>
          </TabsList>

          {/* CREATIVE TAB */}
          <TabsContent value="creative" className="flex-1 overflow-hidden mt-3 px-6 pb-6">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-4">
                {/* Carousel */}
                {images.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Imagens {images.length > 1 && `(${carouselIdx + 1}/${images.length})`}</h3>
                      <Button size="sm" variant="outline" onClick={() => downloadFile(currentImage, `${ad.page_name}-img-${carouselIdx + 1}.jpg`)}>
                        <Download className="h-3 w-3 mr-1" /> Baixar
                      </Button>
                    </div>
                    <div className="relative bg-muted rounded-lg overflow-hidden aspect-square max-h-[500px] mx-auto">
                      <img src={currentImage} alt="" className="w-full h-full object-contain" />
                      {images.length > 1 && (
                        <>
                          <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2"
                            onClick={() => setCarouselIdx(i => (i - 1 + images.length) % images.length)}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setCarouselIdx(i => (i + 1) % images.length)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    {images.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                        {images.map((src, i) => (
                          <button key={i} onClick={() => setCarouselIdx(i)}
                            className={`shrink-0 h-16 w-16 rounded overflow-hidden border-2 ${i === carouselIdx ? "border-primary" : "border-transparent"}`}>
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Videos */}
                {videos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-1"><PlayCircle className="h-4 w-4" /> Vídeos</h3>
                    </div>
                    {videos.map((v, i) => (
                      <div key={i} className="relative">
                        <video src={v} controls className="w-full rounded-lg bg-black max-h-[500px]" />
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => downloadFile(v, `${ad.page_name}-video-${i + 1}.mp4`)}>
                          <Download className="h-3 w-3 mr-1" /> Baixar vídeo {i + 1}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {totalMedia > 1 && (
                  <Button variant="outline" className="w-full" onClick={downloadAll}>
                    <Download className="h-4 w-4 mr-2" /> Baixar todos os {totalMedia} arquivos
                  </Button>
                )}

                {totalMedia === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem mídia disponível neste anúncio</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TEXT TAB */}
          <TabsContent value="text" className="flex-1 overflow-hidden mt-3 px-6 pb-6">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-4">
                {ad.title && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm">Título</h3>
                    </div>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{ad.title}</p>
                  </div>
                )}
                {ad.body && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm">Texto publicitário</h3>
                      <Button size="sm" variant="outline" onClick={copyText}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar
                      </Button>
                    </div>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap break-words">{ad.body}</p>
                  </div>
                )}
                {(ad.cta_text || ad.link_url) && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Call-to-Action</h3>
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                      {ad.cta_text && <Badge variant="secondary" className="text-sm">{ad.cta_text}</Badge>}
                      {ad.link_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <a href={ad.link_url} target="_blank" rel="noreferrer"
                            className="text-primary hover:underline truncate flex-1">{ad.link_url}</a>
                          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(ad.link_url); toast.success("Link copiado!"); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button className="w-full" onClick={copyAll}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar criativo completo
                </Button>

                {ad.ad_library_url && (
                  <a href={ad.ad_library_url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1 text-sm text-primary hover:underline">
                    Ver original na Biblioteca de Anúncios <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI ANALYSIS TAB */}
          <TabsContent value="analysis" className="flex-1 overflow-hidden mt-3 px-6 pb-6">
            <ScrollArea className="h-full pr-3">
              {!analysis && !analyzing && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto text-primary/50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    A IA vai analisar o gancho, gatilhos mentais, público-alvo e sugerir como você pode adaptar esse criativo pro seu nicho.
                  </p>
                  <Button onClick={analyze} size="lg">
                    <Sparkles className="h-4 w-4 mr-2" /> Analisar com IA
                  </Button>
                </div>
              )}
              {analyzing && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Analisando criativo...</p>
                </div>
              )}
              {analysis && (
                <div className="space-y-4">
                  <RenderMarkdown text={analysis} />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(analysis); toast.success("Análise copiada!"); }}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar análise
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
