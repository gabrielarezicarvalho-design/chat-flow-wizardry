import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wand2,
  Sparkles,
  Scissors,
  ArrowUpToLine,
  ImagePlus,
  Download,
  Trash2,
  Upload,
  Loader2,
  Palette,
  Images,
  RefreshCw,
  X,
} from "lucide-react";

type Mode = "generate" | "edit" | "remove_bg" | "upscale" | "ad_creative";
type AspectRatio = "1:1" | "9:16" | "16:9" | "4:5" | "3:4";

const MODELS = [
  { id: "openai/gpt-image-2", label: "GPT Image 2 (padrão, agência/marketing)" },
  { id: "google/gemini-3-pro-image", label: "Gemini 3 Pro Image (fotorrealismo)" },
  { id: "google/gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image (rápido)" },
  { id: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash (Nano Banana)" },
  { id: "openai/gpt-image-1-mini", label: "GPT Image 1 Mini (rápido/barato)" },
];

const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "1:1", label: "1:1 Feed" },
  { id: "4:5", label: "4:5 Instagram" },
  { id: "9:16", label: "9:16 Story/Reels" },
  { id: "16:9", label: "16:9 Banner" },
  { id: "3:4", label: "3:4 Retrato" },
];

const AD_TEMPLATES = [
  {
    id: "story",
    label: "Story 9:16",
    prompt:
      "Vertical 9:16 story ad, bold headline, high-contrast background, modern typography, eye-catching product highlight",
  },
  {
    id: "feed",
    label: "Feed 1:1",
    prompt:
      "Square 1:1 feed ad, product-centric composition, clean modern design, marketing headline, professional lighting",
  },
  {
    id: "carousel",
    label: "Carrossel",
    prompt:
      "Square carousel slide with numbered step design, minimalist layout, brand-consistent colors, marketing copy",
  },
  {
    id: "banner",
    label: "Banner",
    prompt:
      "Wide 16:9 web banner, product hero shot, strong CTA area on the right, gradient background",
  },
];

interface GeneratedImage {
  id: string;
  prompt: string;
  mode: Mode;
  model: string;
  image_url: string;
  created_at: string;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function ImageDesigner() {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [enhance, setEnhance] = useState(true);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<GeneratedImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sourceFile) {
      setSourcePreview(null);
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setSourcePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  const { data: gallery = [], isLoading: galleryLoading } = useQuery({
    queryKey: ["generated-images", companyId, user?.id],
    queryFn: async () => {
      const q = supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GeneratedImage[];
    },
    enabled: !!user,
  });

  const handleGenerate = async () => {
    if (!prompt.trim() && mode !== "remove_bg" && mode !== "upscale") {
      toast.error("Descreva o que você quer gerar");
      return;
    }
    if ((mode === "edit" || mode === "remove_bg" || mode === "upscale") && !sourceFile) {
      toast.error("Envie uma imagem de origem");
      return;
    }

    setLoading(true);
    try {
      const sourceImageBase64 = sourceFile ? await fileToBase64(sourceFile) : undefined;
      const { data, error } = await supabase.functions.invoke("image-designer", {
        body: {
          prompt: prompt.trim() || "image",
          mode,
          model,
          aspectRatio,
          enhance,
          sourceImageBase64,
        },
      });
      if (error) throw error;
      const image = (data as { image: GeneratedImage }).image;
      setLatest(image);
      qc.invalidateQueries({ queryKey: ["generated-images"] });
      toast.success("Imagem gerada com sucesso!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) toast.error("Limite de requisições atingido. Aguarde alguns segundos.");
      else if (msg.includes("402"))
        toast.error("Créditos de IA esgotados. Adicione créditos no workspace.");
      else toast.error(`Erro ao gerar imagem: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (img: GeneratedImage) => {
    const { error } = await supabase.from("generated_images").delete().eq("id", img.id);
    if (error) toast.error("Erro ao excluir");
    else {
      qc.invalidateQueries({ queryKey: ["generated-images"] });
      toast.success("Imagem excluída");
    }
  };

  const download = (url: string, name = "imagem.png") => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const needsSource = mode === "edit" || mode === "remove_bg" || mode === "upscale";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 text-primary-foreground shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur">
            <Palette className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Designer de Imagens</h1>
            <p className="mt-1 text-primary-foreground/80">
              Gere, edite e prepare criativos para seus anúncios com IA — direto no Next Pro.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Criar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generate" className="gap-1">
                  <Sparkles className="h-4 w-4" /> Gerar
                </TabsTrigger>
                <TabsTrigger value="edit" className="gap-1">
                  <ImagePlus className="h-4 w-4" /> Editar
                </TabsTrigger>
              </TabsList>
              <TabsList className="mt-2 grid w-full grid-cols-3">
                <TabsTrigger value="ad_creative" className="text-xs">
                  Anúncio
                </TabsTrigger>
                <TabsTrigger value="remove_bg" className="gap-1 text-xs">
                  <Scissors className="h-3 w-3" /> Fundo
                </TabsTrigger>
                <TabsTrigger value="upscale" className="gap-1 text-xs">
                  <ArrowUpToLine className="h-3 w-3" /> Upscale
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ad_creative" className="mt-4 space-y-2">
                <Label>Templates rápidos</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AD_TEMPLATES.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPrompt((p) => (p ? `${p}\n${t.prompt}` : t.prompt))
                      }
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {needsSource && (
              <div className="space-y-2">
                <Label>Imagem de origem</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 transition hover:bg-muted/50"
                >
                  {sourcePreview ? (
                    <img
                      src={sourcePreview}
                      alt="Origem"
                      className="max-h-40 rounded object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique para enviar (PNG, JPG)
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSourceFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {mode !== "remove_bg" && mode !== "upscale" && (
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  rows={5}
                  placeholder={
                    mode === "edit"
                      ? "Ex: troque o fundo por um escritório moderno"
                      : mode === "ad_creative"
                        ? "Ex: anúncio de smartphone premium, headline 'Velocidade que impressiona', paleta azul e preta"
                        : "Ex: mockup fotorrealista de um app mobile de e-commerce, iluminação de estúdio"
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
            )}

            {mode !== "remove_bg" && mode !== "upscale" && (
              <div className="space-y-2">
                <Label>Formato</Label>
                <div className="grid grid-cols-5 gap-1">
                  {ASPECT_RATIOS.map((a) => (
                    <Button
                      key={a.id}
                      type="button"
                      variant={aspectRatio === a.id ? "default" : "outline"}
                      size="sm"
                      className="px-1 text-[11px]"
                      onClick={() => setAspectRatio(a.id)}
                    >
                      {a.id}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {ASPECT_RATIOS.find((a) => a.id === aspectRatio)?.label}
                </p>
              </div>
            )}

            {mode !== "remove_bg" && mode !== "upscale" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 transition hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={enhance}
                  onChange={(e) => setEnhance(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Designer IA (recomendado)</p>
                  <p className="text-xs text-muted-foreground">
                    Reescreve seu prompt em nível de designer gráfico profissional, com iluminação,
                    tipografia, paleta e composição de anúncio 4K.
                  </p>
                </div>
              </label>
            )}

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Gerar imagem
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview + gallery */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="aspect-square w-full" />
              ) : latest ? (
                <div className="space-y-3">
                  <img
                    src={latest.image_url}
                    alt={latest.prompt}
                    className="w-full rounded-lg border border-border"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => download(latest.image_url, `next-pro-${latest.id}.png`)}
                    >
                      <Download className="mr-1 h-4 w-4" /> Baixar
                    </Button>
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                      {latest.prompt}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground">
                  <div className="text-center">
                    <Sparkles className="mx-auto h-10 w-10 opacity-40" />
                    <p className="mt-2 text-sm">
                      Sua imagem gerada aparecerá aqui
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Galeria da empresa</CardTitle>
            </CardHeader>
            <CardContent>
              {galleryLoading ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
                </div>
              ) : gallery.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma imagem gerada ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      className="group relative overflow-hidden rounded-lg border border-border"
                    >
                      <img
                        src={img.image_url}
                        alt={img.prompt}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                        <p className="line-clamp-2 text-xs text-white">{img.prompt}</p>
                        <div className="mt-2 flex gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7"
                            onClick={() => download(img.image_url, `next-pro-${img.id}.png`)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            onClick={() => handleDelete(img)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
