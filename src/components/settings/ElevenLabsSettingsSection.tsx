import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Mic, Loader2, Play } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIProviderKeys } from "@/hooks/useAIProviderKeys";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (feminina, suave)" },
  { id: "FGY2WhTYpPnrIDTdsKH5", label: "Laura (feminina, jovem)" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda (feminina, calorosa)" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice (feminina, clara)" },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica (feminina, expressiva)" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily (feminina, doce)" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George (masculina, madura)" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel (masculina, autoritária)" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian (masculina, profunda)" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam (masculina, jovem)" },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie (masculina, natural)" },
  { id: "cjVigY5qzO86Huf0OWal", label: "Eric (masculina, amigável)" },
];

const LANGUAGES = [
  { value: "pt", label: "Português (Brasil)" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
  { value: "it", label: "Italiano" },
  { value: "de", label: "Alemão" },
  { value: "auto", label: "Detectar automaticamente" },
];

interface ElevenLabsPrefs {
  voice_id: string;
  language: string;
  speed: number;
  stability: number;
  similarity: number;
}

const DEFAULTS: ElevenLabsPrefs = {
  voice_id: "EXAVITQu4vr4xnSDxMaL",
  language: "pt",
  speed: 0.95,
  stability: 0.45,
  similarity: 0.8,
};

export const ElevenLabsSettingsSection = () => {
  const { isLoading, getRawSetting, saveSetting } = useAIProviderKeys();
  const saved = useMemo(
    () => getRawSetting<Partial<ElevenLabsPrefs>>("elevenlabs_prefs"),
    [getRawSetting]
  );

  const [prefs, setPrefs] = useState<ElevenLabsPrefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (saved) setPrefs({ ...DEFAULTS, ...saved });
  }, [saved]);

  const update = <K extends keyof ElevenLabsPrefs>(k: K, v: ElevenLabsPrefs[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting("elevenlabs_prefs", prefs);
      toast.success("Preferências de voz salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const sample =
        prefs.language === "en"
          ? "Hello! This is a preview of my voice."
          : prefs.language === "es"
          ? "¡Hola! Esta es una prueba de mi voz."
          : "Olá! Esta é uma prévia da minha voz.";

      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: {
          text: sample,
          voice: prefs.voice_id,
          stability: prefs.stability,
          similarity: prefs.similarity,
          speed: prefs.speed,
        },
      });
      if (error) throw error;
      const b64 = (data as { audioContent?: string })?.audioContent;
      if (!b64) throw new Error("Sem áudio retornado");
      const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
      await audio.play();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar áudio");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Mic className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Voz das Conversas (ElevenLabs)</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Escolha a voz, o idioma e a velocidade usados para gerar áudios nas conversas e fluxos de automação.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label>Voz</Label>
          <Select value={prefs.voice_id} onValueChange={(v) => update("voice_id", v)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Idioma</Label>
          <Select value={prefs.language} onValueChange={(v) => update("language", v)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <div className="flex justify-between">
              <Label>Velocidade</Label>
              <span className="text-sm text-muted-foreground">{prefs.speed.toFixed(2)}x</span>
            </div>
            <Slider
              value={[prefs.speed]}
              min={0.7}
              max={1.2}
              step={0.05}
              onValueChange={([v]) => update("speed", v)}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex justify-between">
              <Label>Estabilidade</Label>
              <span className="text-sm text-muted-foreground">{prefs.stability.toFixed(2)}</span>
            </div>
            <Slider
              value={[prefs.stability]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([v]) => update("stability", v)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Menor = mais expressiva. Maior = mais consistente.
            </p>
          </div>

          <div>
            <div className="flex justify-between">
              <Label>Similaridade</Label>
              <span className="text-sm text-muted-foreground">{prefs.similarity.toFixed(2)}</span>
            </div>
            <Slider
              value={[prefs.similarity]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([v]) => update("similarity", v)}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar preferências
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Testar voz
        </Button>
      </div>
    </Card>
  );
};

export default ElevenLabsSettingsSection;
