import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import {
  Music2,
  Sparkles,
  Zap,
  Target,
  Shield,
  Users,
  Hash,
  AtSign,
  Search,
  Download,
  Loader2,
  Globe,
  MapPin,
  Trophy,
  Flame,
  Crown,
  ArrowRight,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";

interface TikTokLead {
  username: string;
  full_name?: string;
  bio?: string;
  followers?: number;
  email?: string;
  website?: string;
  region?: string;
  profile_pic?: string;
  verified?: boolean;
}

type ExtractionMode = "profile" | "hashtag" | "search" | "bulk";

const POPULAR_SEARCHES = [
  "moda", "beleza", "fitness", "receitas", "marketing digital",
  "empreendedorismo", "petshop", "imobiliária", "advocacia", "restaurante",
];

export default function TikTokLeads() {
  const [mode, setMode] = useState<ExtractionMode>("profile");
  const [inputValue, setInputValue] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<TikTokLead[]>([]);
  const { createLead } = useLeads();

  const handleSearch = async () => {
    if (!inputValue.trim()) {
      toast.error("Preencha o campo antes de extrair.");
      return;
    }
    setLoading(true);
    setLeads([]);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-leads", {
        body: { mode, input: inputValue.trim(), quantity },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: TikTokLead[] = data?.leads || [];
      setLeads(list);
      if (list.length === 0) {
        toast.info("Nenhum perfil encontrado.");
      } else {
        toast.success(`${list.length} perfis encontrados!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao extrair perfis");
    } finally {
      setLoading(false);
    }
  };

  const saveLead = (l: TikTokLead) => {
    createLead.mutate({
      name: l.full_name || l.username,
      email: l.email || null,
      source: "tiktok",
      custom_fields: {
        tiktok_username: l.username,
        bio: l.bio,
        followers: l.followers,
        website: l.website,
        region: l.region,
      },
    });
  };

  const saveAll = () => {
    leads.forEach((l) => saveLead(l));
    toast.success(`${leads.length} leads salvos!`);
  };

  const exportCSV = () => {
    if (leads.length === 0) return;
    const rows = [
      ["Username", "Nome", "Email", "Website", "Seguidores", "Região", "Bio"],
      ...leads.map((l) => [
        l.username, l.full_name || "", l.email || "", l.website || "",
        l.followers?.toString() || "", l.region || "", (l.bio || "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tiktok-leads-${Date.now()}.csv`;
    a.click();
  };

  const modeConfig: Record<ExtractionMode, { icon: any; label: string; placeholder: string; hint: string }> = {
    profile: { icon: AtSign, label: "Perfil", placeholder: "@usuario", hint: "Extrai dados de um perfil TikTok." },
    hashtag: { icon: Hash, label: "Hashtag", placeholder: "#marketing", hint: "Coleta autores de vídeos com a hashtag." },
    search: { icon: Search, label: "Busca", placeholder: "moda feminina", hint: "Busca por palavra-chave no TikTok." },
    bulk: { icon: Users, label: "Perfis em massa", placeholder: "@user1, @user2, @user3", hint: "Enriquece uma lista de perfis." },
  };

  const current = modeConfig[mode];
  const estimatedEmails = Math.round(quantity * 0.15);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Hero */}
      <Card className="relative overflow-hidden border-border bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/30 dark:via-background dark:to-blue-950/30 p-8 md:p-12 mb-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -z-0" />

        <div className="relative z-10 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-primary to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
              <Music2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Gerador de<br />Leads{" "}
              <span className="bg-gradient-to-r from-blue-500 via-primary to-blue-700 bg-clip-text text-transparent">
                TikTok
              </span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg">
              Encontre criadores e perfis qualificados no TikTok e gere leads prontos para vender mais!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-2xl">
              <FeaturePill icon={Target} title="Mais Precisão" desc="Encontre o público certo para seu negócio" color="blue" />
              <FeaturePill icon={Zap} title="Mais Agilidade" desc="Extraia leads em segundos" color="amber" />
              <FeaturePill icon={Shield} title="Mais Resultados" desc="Conecte, encante e venda mais!" color="emerald" />
            </div>
          </div>

          <div>
            <Card className="bg-card border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-foreground font-semibold text-sm">Como funciona?</span>
              </div>
              <div className="space-y-4">
                <Step n={1} title="Defina os filtros" desc="Perfil, hashtag ou busca" />
                <Step n={2} title="Buscamos no TikTok" desc="Nosso sistema encontra os melhores perfis" />
                <Step n={3} title="Leads prontos para uso" desc="Baixe ou conecte seu CRM e comece a vender!" />
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Warning */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-100">
          <strong>Aviso importante:</strong> o TikTok não expõe telefone publicamente. Coletamos <strong>username, bio, seguidores, e-mail (quando presente na bio) e link externo</strong>. Você paga pelos <strong>perfis processados</strong>.
        </div>
      </Card>

      {/* Extraction panel */}
      <Card className="relative overflow-hidden border-border bg-card p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-primary to-blue-700 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-primary bg-clip-text text-transparent">
            Gerador de Leads TikTok
          </h2>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as ExtractionMode)} className="w-full">
          <TabsList className="grid grid-cols-4 bg-muted border border-border p-1 h-auto">
            {(Object.keys(modeConfig) as ExtractionMode[]).map((k) => {
              const Ic = modeConfig[k].icon;
              return (
                <TabsTrigger
                  key={k}
                  value={k}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground py-2.5 gap-2"
                >
                  <Ic className="w-4 h-4" />
                  <span className="hidden sm:inline">{modeConfig[k].label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={mode} className="mt-6 space-y-5">
            <div>
              <Label className="text-foreground mb-2 block">{current.label}</Label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={current.placeholder}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground h-12"
              />
              <p className="text-xs text-muted-foreground mt-2">{current.hint}</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-foreground">Quantos perfis extrair?</Label>
                <span className="text-foreground font-bold text-lg">{quantity}</span>
              </div>
              <Slider
                value={[quantity]}
                onValueChange={(v) => setQuantity(v[0])}
                min={10}
                max={200}
                step={10}
                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Custo: {quantity} créditos</span>
                <span className="text-primary">Estimativa: ~{estimatedEmails} perfis com e-mail</span>
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 via-primary to-blue-700 hover:from-blue-500 hover:via-primary hover:to-blue-600 text-primary-foreground font-semibold shadow-lg shadow-primary/30 border-0"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Extraindo...</>
              ) : (
                <><Search className="w-5 h-5 mr-2" /> BUSCAR</>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} value="+1.8M" label="Criadores mapeados" sub="Busca inteligente e precisa" gradient="from-blue-500 to-primary" />
        <StatCard icon={Target} value="97.4%" label="Precisão dos filtros" sub="Leads altamente qualificados" gradient="from-primary to-blue-700" />
        <StatCard icon={Zap} value="7.1s" label="Tempo médio" sub="Resultados em segundos" gradient="from-amber-500 to-orange-500" />
        <StatCard icon={Download} value="100%" label="Exportável" sub="Baixe ou integre ao CRM" gradient="from-emerald-500 to-blue-500" />
      </div>

      {/* Popular + Tip */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 bg-card border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-foreground font-semibold">Buscas populares</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => { setMode("search"); setInputValue(s); }}
                className="px-4 py-1.5 rounded-full border border-border text-foreground/80 text-sm hover:bg-muted hover:border-primary/50 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-foreground font-semibold">Dica de ouro</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Use hashtags de nicho para encontrar criadores e leads muito mais qualificados!
          </p>
        </Card>
      </div>

      {/* Results */}
      {leads.length > 0 && (
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-foreground font-semibold text-lg">
              {leads.length} perfis encontrados
            </h3>
            <div className="flex gap-2">
              <Button onClick={exportCSV} variant="outline" className="border-border text-foreground hover:bg-muted">
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
              <Button onClick={saveAll} className="bg-gradient-to-r from-blue-600 to-primary text-primary-foreground">
                Salvar todos
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {leads.map((l, i) => (
              <Card key={i} className="bg-card border-border p-4 hover:border-primary/50 hover:-translate-y-1 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-primary to-blue-700 flex items-center justify-center text-primary-foreground font-bold flex-shrink-0 overflow-hidden">
                    {l.profile_pic
                      ? <img src={l.profile_pic} alt={l.username} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      : l.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold truncate">@{l.username}</p>
                      {l.verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                    </div>
                    {l.full_name && <p className="text-muted-foreground text-sm truncate">{l.full_name}</p>}
                    {l.followers !== undefined && (
                      <p className="text-muted-foreground/70 text-xs mt-1">{l.followers.toLocaleString("pt-BR")} seguidores</p>
                    )}
                    {l.bio && <p className="text-muted-foreground text-xs mt-2 line-clamp-2 break-words">{l.bio}</p>}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {l.email && <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-300 text-xs break-all">{l.email}</Badge>}
                      {l.website && <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-300 text-xs"><Globe className="w-3 h-3 mr-1" />site</Badge>}
                      {l.region && <Badge variant="outline" className="border-primary/30 text-primary text-xs"><MapPin className="w-3 h-3 mr-1" />{l.region}</Badge>}
                    </div>

                    <Button
                      onClick={() => saveLead(l)}
                      size="sm"
                      className="mt-3 w-full bg-primary/90 hover:bg-primary text-primary-foreground text-xs"
                    >
                      Salvar como lead
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Upgrade card */}
      <Card className="mt-6 relative overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-primary to-blue-700 p-6">
        <div className="flex items-center gap-4 justify-between flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg whitespace-nowrap">Plano Profissional</h3>
              <p className="text-white/80 text-sm">Acesso completo a tudo</p>
            </div>
          </div>
          <Button className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg rounded-full px-6">
            Ver planos <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FeaturePill({ icon: Icon, title, desc, color }: any) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/30 dark:text-blue-400",
    amber: "text-amber-600 bg-amber-500/10 border-amber-500/30 dark:text-amber-400",
    emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400",
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-foreground font-semibold text-sm">{title}</p>
      <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
        {n}
      </div>
      <div>
        <p className="text-foreground font-semibold text-sm">{title}</p>
        <p className="text-muted-foreground text-xs">{desc}</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, sub, gradient }: any) {
  return (
    <Card className="bg-card border-border p-5 hover:border-primary/50 hover:-translate-y-1 transition-all">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-primary bg-clip-text text-transparent">{value}</p>
      <p className="text-foreground font-medium text-sm mt-1">{label}</p>
      <p className="text-muted-foreground text-xs">{sub}</p>
    </Card>
  );
}
