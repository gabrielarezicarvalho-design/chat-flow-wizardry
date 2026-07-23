import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Zap, Key, CheckCircle, XCircle, Save, RotateCcw, Loader2,
  Instagram, Music2, Facebook, Info, Copy,
} from "lucide-react";
import { ApifyUsageCard } from "@/components/admin/ApifyUsageCard";

type CollectorId = "instagram" | "tiktok" | "facebook";

interface CollectorConfig {
  actor_id: string;
  timeout_sec: number;
  memory_mb: number;
  default_quantity: number;
  enabled: boolean;
}

const DEFAULTS: Record<CollectorId, CollectorConfig> = {
  instagram: {
    actor_id: "apify~instagram-profile-scraper",
    timeout_sec: 120,
    memory_mb: 1024,
    default_quantity: 50,
    enabled: true,
  },
  tiktok: {
    actor_id: "clockworks~free-tiktok-scraper",
    timeout_sec: 180,
    memory_mb: 1024,
    default_quantity: 50,
    enabled: true,
  },
  facebook: {
    actor_id: "apify~facebook-ads-scraper",
    timeout_sec: 130,
    memory_mb: 1024,
    default_quantity: 30,
    enabled: true,
  },
};

const META: Record<CollectorId, { label: string; icon: any; color: string; hint: string }> = {
  instagram: {
    label: "Instagram Leads",
    icon: Instagram,
    color: "text-pink-400",
    hint: "Actor recomendado: apify~instagram-profile-scraper (perfis) ou apify~instagram-hashtag-scraper (hashtags).",
  },
  tiktok: {
    label: "TikTok Leads",
    icon: Music2,
    color: "text-cyan-400",
    hint: "Actor recomendado: clockworks~free-tiktok-scraper (grátis) para perfis, hashtags e buscas.",
  },
  facebook: {
    label: "Facebook Ads Spy",
    icon: Facebook,
    color: "text-blue-400",
    hint: "Actor recomendado: apify~facebook-ads-scraper para varrer a Biblioteca de Anúncios.",
  },
};

const LS_KEY = "apify_collector_configs_v1";

function loadConfigs(): Record<CollectorId, CollectorConfig> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      instagram: { ...DEFAULTS.instagram, ...(parsed.instagram || {}) },
      tiktok: { ...DEFAULTS.tiktok, ...(parsed.tiktok || {}) },
      facebook: { ...DEFAULTS.facebook, ...(parsed.facebook || {}) },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function AdminApify() {
  const [tokenConfigured, setTokenConfigured] = useState<boolean | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [configs, setConfigs] = useState<Record<CollectorId, CollectorConfig>>(loadConfigs());
  const [tab, setTab] = useState<CollectorId>("instagram");

  const checkToken = async () => {
    setLoadingToken(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-integrations-status");
      if (error) throw error;
      const item = (data?.secrets || []).find((s: any) => s.name === "APIFY_TOKEN");
      setTokenConfigured(!!item?.configured);
    } catch {
      setTokenConfigured(null);
    } finally {
      setLoadingToken(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  const update = (id: CollectorId, patch: Partial<CollectorConfig>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(configs));
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  const resetOne = (id: CollectorId) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...DEFAULTS[id] } }));
    toast.success(`${META[id].label} redefinido para padrão`);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(
      "Por favor, atualize o secret APIFY_TOKEN com meu novo token da Apify."
    );
    toast.success("Instrução copiada — cole no chat do Lovable");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="h-8 w-8 text-purple-400" />
            Apify Scrapers
          </h1>
          <p className="text-slate-400 mt-1">
            Gerencie o token da Apify e as opções dos coletores (Instagram, TikTok, Facebook Ads).
          </p>
        </div>
        <Button onClick={save} className="bg-purple-600 hover:bg-purple-700">
          <Save className="h-4 w-4 mr-2" /> Salvar alterações
        </Button>
      </div>

      {/* Token status */}
      <div className="p-5 rounded-lg bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Key className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">APIFY_TOKEN</h3>
              <p className="text-xs text-slate-400">
                Secret usado por todas as edge functions dos coletores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loadingToken ? (
              <Badge variant="outline" className="border-white/10 text-slate-300">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Verificando
              </Badge>
            ) : tokenConfigured ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                <CheckCircle className="h-3 w-3 mr-1" /> Configurado
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                <XCircle className="h-3 w-3 mr-1" /> Ausente
              </Badge>
            )}
            <Button size="sm" variant="outline" className="border-white/10" onClick={checkToken}>
              Reverificar
            </Button>
          </div>
        </div>
        <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>
              Para <strong>atualizar</strong> o token, peça ao assistente do Lovable no chat.
              O valor fica armazenado como secret e não pode ser editado direto da UI.
            </p>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-200 hover:text-white" onClick={copyPrompt}>
              <Copy className="h-3 w-3 mr-1" /> Copiar instrução para o chat
            </Button>
          </div>
        </div>
      </div>

      {/* Usage card */}
      <ApifyUsageCard />

      {/* Collector configs */}
      <div className="rounded-lg bg-white/5 border border-white/10">
        <Tabs value={tab} onValueChange={(v) => setTab(v as CollectorId)}>
          <TabsList className="bg-transparent border-b border-white/10 rounded-none w-full justify-start p-0 h-auto">
            {(Object.keys(META) as CollectorId[]).map((id) => {
              const Icon = META[id].icon;
              return (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="data-[state=active]:bg-white/5 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-purple-400 px-6 py-3"
                >
                  <Icon className={`h-4 w-4 mr-2 ${META[id].color}`} />
                  {META[id].label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(META) as CollectorId[]).map((id) => {
            const cfg = configs[id];
            return (
              <TabsContent key={id} value={id} className="p-6 space-y-5 mt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={cfg.enabled}
                      onCheckedChange={(v) => update(id, { enabled: v })}
                    />
                    <div>
                      <div className="text-white font-medium">
                        {cfg.enabled ? "Coletor habilitado" : "Coletor desabilitado"}
                      </div>
                      <div className="text-xs text-slate-400">{META[id].hint}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    onClick={() => resetOne(id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-2" /> Padrão
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-200">Actor ID (formato: usuario~actor)</Label>
                    <Input
                      value={cfg.actor_id}
                      onChange={(e) => update(id, { actor_id: e.target.value })}
                      className="bg-white/5 border-white/10 text-white font-mono"
                      placeholder="apify~instagram-profile-scraper"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Timeout (segundos)</Label>
                    <Input
                      type="number"
                      min={30}
                      max={600}
                      value={cfg.timeout_sec}
                      onChange={(e) =>
                        update(id, { timeout_sec: Number(e.target.value) || 0 })
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-slate-500">Máximo recomendado: 300s.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Memória (MB)</Label>
                    <Input
                      type="number"
                      min={256}
                      max={8192}
                      step={256}
                      value={cfg.memory_mb}
                      onChange={(e) =>
                        update(id, { memory_mb: Number(e.target.value) || 0 })
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-slate-500">Padrão: 1024 MB. Mais RAM = mais custo.</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-200">Quantidade padrão de resultados</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={cfg.default_quantity}
                      onChange={(e) =>
                        update(id, { default_quantity: Number(e.target.value) || 0 })
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-slate-500">
                      Usada quando o usuário não especifica uma quantidade na página do coletor.
                    </p>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <div className="p-4 rounded-md bg-white/5 border border-white/10 text-xs text-slate-400">
        As configurações ficam salvas no navegador (localStorage) e são lidas pelas páginas dos
        coletores. Para alterar Actor IDs padrão em ambiente de produção, atualize também as
        edge functions correspondentes.
      </div>
    </div>
  );
}
