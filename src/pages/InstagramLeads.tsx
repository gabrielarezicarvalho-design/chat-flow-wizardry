import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import {
  Instagram,
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  Users,
  MessageSquare,
  Hash,
  AtSign,
  Search,
  Download,
  Loader2,
  Phone,
  Globe,
  MapPin,
  Flame,
  Crown,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Database,
  Clock,
} from "lucide-react";

interface InstagramLead {
  username: string;
  full_name?: string;
  bio?: string;
  followers?: number;
  phone?: string;
  email?: string;
  website?: string;
  city?: string;
  category?: string;
  profile_pic?: string;
  is_business?: boolean;
}

type ExtractionMode = "followers" | "comments" | "hashtag" | "bulk";

const POPULAR_SEARCHES = [
  "Loja de Roupas", "Academia", "Barbearia", "Salão de Beleza",
  "Restaurante", "Advocacia", "Clínica", "Imobiliária",
  "Pet Shop", "Confeitaria",
];

export default function InstagramLeads() {
  const [mode, setMode] = useState<ExtractionMode>("followers");
  const [inputValue, setInputValue] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<InstagramLead[]>([]);
  const { createLead } = useLeads();

  const handleSearch = async () => {
    if (!inputValue.trim()) {
      toast.error("Preencha o campo antes de extrair.");
      return;
    }
    setLoading(true);
    setLeads([]);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-leads", {
        body: { mode, input: inputValue.trim(), quantity },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: InstagramLead[] = data?.leads || [];
      setLeads(list);
      if (list.length === 0) toast.info("Nenhum perfil encontrado.");
      else toast.success(`${list.length} perfis encontrados!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao extrair perfis");
    } finally {
      setLoading(false);
    }
  };

  const saveLead = (l: InstagramLead) => {
    createLead.mutate({
      name: l.full_name || l.username,
      phone: l.phone || null,
      email: l.email || null,
      source: "instagram",
      custom_fields: {
        instagram_username: l.username,
        bio: l.bio,
        followers: l.followers,
        website: l.website,
        category: l.category,
        city: l.city,
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
      ["Username", "Nome", "Telefone", "Email", "Website", "Seguidores", "Bio"],
      ...leads.map((l) => [
        l.username, l.full_name || "", l.phone || "", l.email || "",
        l.website || "", l.followers?.toString() || "", (l.bio || "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instagram-leads-${Date.now()}.csv`;
    a.click();
  };

  const modeConfig: Record<ExtractionMode, { icon: any; label: string; placeholder: string; hint: string }> = {
    followers: { icon: Users, label: "Seguidores", placeholder: "@usuario", hint: "Extrai seguidores de um perfil público." },
    comments: { icon: MessageSquare, label: "Comentários", placeholder: "https://instagram.com/p/...", hint: "Extrai perfis que comentaram em um post." },
    hashtag: { icon: Hash, label: "Hashtag", placeholder: "#marketing", hint: "Extrai perfis que usam uma hashtag." },
    bulk: { icon: AtSign, label: "Perfis em massa", placeholder: "@user1, @user2, @user3", hint: "Enriquece uma lista de perfis." },
  };

  const current = modeConfig[mode];
  const estimatedPhones = Math.round(quantity * 0.3);

  return (
    <div className="min-h-screen bg-background">
      {/* Page header — enterprise, restrained */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Instagram className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold border-primary/30 text-primary bg-primary/5">
                    Prospecção B2B
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                    Operacional
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  Instagram Lead Intelligence
                </h1>
                <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
                  Plataforma corporativa de extração e enriquecimento de leads qualificados a partir do Instagram — dados de contato reais, integração direta com seu CRM.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>LGPD compliant</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Database className="w-4 h-4 text-primary" />
                <span>API Enterprise</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Perfis indexados" value="2.5M+" delta="+12% mês" />
          <KpiCard icon={Target} label="Precisão de filtros" value="98.7%" delta="SLA garantido" />
          <KpiCard icon={Clock} label="Tempo médio" value="6.2s" delta="por busca" />
          <KpiCard icon={TrendingUp} label="Taxa de conversão" value="~30%" delta="c/ telefone visível" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: extraction panel (2 cols) */}
          <Card className="lg:col-span-2 border-border bg-card p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Nova extração</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Selecione o método de captura e defina os parâmetros</p>
              </div>
              <Badge variant="outline" className="text-xs border-border">
                <Sparkles className="w-3 h-3 mr-1.5 text-primary" />
                Motor Apify
              </Badge>
            </div>

            <div className="p-6">
              <Tabs value={mode} onValueChange={(v) => setMode(v as ExtractionMode)} className="w-full">
                <TabsList className="grid grid-cols-4 bg-muted/50 border border-border p-1 h-auto rounded-lg">
                  {(Object.keys(modeConfig) as ExtractionMode[]).map((k) => {
                    const Ic = modeConfig[k].icon;
                    return (
                      <TabsTrigger
                        key={k}
                        value={k}
                        className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground py-2.5 gap-2 text-xs font-medium rounded-md"
                      >
                        <Ic className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{modeConfig[k].label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value={mode} className="mt-6 space-y-6">
                  <div>
                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 block">
                      {current.label}
                    </Label>
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={current.placeholder}
                      className="bg-background border-input text-foreground placeholder:text-muted-foreground h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      {current.hint}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">Volume de extração</Label>
                      <div className="flex items-baseline gap-1">
                        <span className="text-foreground font-bold text-2xl tabular-nums">{quantity}</span>
                        <span className="text-muted-foreground text-xs">perfis</span>
                      </div>
                    </div>
                    <Slider
                      value={[quantity]}
                      onValueChange={(v) => setQuantity(v[0])}
                      min={10}
                      max={500}
                      step={10}
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      <span className="flex items-center gap-1.5"><Database className="w-3 h-3" />Custo: <strong className="text-foreground">{quantity} créditos</strong></span>
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-emerald-500" />~<strong className="text-foreground">{estimatedPhones}</strong> c/ telefone</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando extração...</>
                    ) : (
                      <><Search className="w-4 h-4 mr-2" /> Iniciar extração</>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </Card>

          {/* Right: how it works + compliance */}
          <div className="space-y-6">
            <Card className="border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Fluxo operacional</span>
              </div>
              <div className="space-y-5">
                <Step n={1} title="Configure parâmetros" desc="Método, target e volume de captura" />
                <Separator />
                <Step n={2} title="Extração em tempo real" desc="Motor Apify processa e enriquece dados" />
                <Separator />
                <Step n={3} title="Entrega qualificada" desc="Exportação CSV ou push direto ao CRM" />
              </div>
            </Card>

            <Card className="border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
                  <strong className="block mb-1">Política de dados</strong>
                  Aproximadamente <strong>30%</strong> dos perfis públicos exibem telefone. A cobrança é baseada em perfis <strong>processados</strong>, não em perfis com contato.
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Popular searches */}
        <Card className="border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-foreground">Segmentos populares</h3>
            </div>
            <span className="text-xs text-muted-foreground">Clique para preencher</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => setInputValue(s)}
                className="px-3.5 py-1.5 rounded-md border border-border bg-background text-foreground/80 text-xs font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Results */}
        {leads.length > 0 && (
          <Card className="border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {leads.length} perfis extraídos
                  </h3>
                  <p className="text-xs text-muted-foreground">Prontos para importação e ativação</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportCSV} variant="outline" size="sm" className="border-border">
                  <Download className="w-3.5 h-3.5 mr-2" /> Exportar CSV
                </Button>
                <Button onClick={saveAll} size="sm" className="bg-primary text-primary-foreground">
                  Salvar todos no CRM
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-px bg-border">
              {leads.map((l, i) => (
                <div key={i} className="bg-card p-5 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                      {l.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-foreground font-semibold text-sm truncate">@{l.username}</p>
                        {l.is_business && (
                          <Badge variant="outline" className="border-primary/30 text-primary text-[10px] h-4 px-1.5">BUSINESS</Badge>
                        )}
                      </div>
                      {l.full_name && <p className="text-muted-foreground text-xs truncate mt-0.5">{l.full_name}</p>}
                      {l.followers !== undefined && (
                        <p className="text-muted-foreground/70 text-[11px] mt-1 tabular-nums">
                          {l.followers.toLocaleString("pt-BR")} seguidores
                        </p>
                      )}
                      {l.bio && <p className="text-muted-foreground text-xs mt-2 line-clamp-2 leading-relaxed">{l.bio}</p>}

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {l.phone && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-[10px] h-5">
                            <Phone className="w-2.5 h-2.5 mr-1" />{l.phone}
                          </Badge>
                        )}
                        {l.website && (
                          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300 text-[10px] h-5">
                            <Globe className="w-2.5 h-2.5 mr-1" />site
                          </Badge>
                        )}
                        {l.city && (
                          <Badge variant="outline" className="border-border text-[10px] h-5">
                            <MapPin className="w-2.5 h-2.5 mr-1" />{l.city}
                          </Badge>
                        )}
                      </div>

                      <Button
                        onClick={() => saveLead(l)}
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full h-8 text-xs border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      >
                        + Adicionar ao CRM
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Upgrade CTA — refined */}
        <Card className="border-border bg-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground font-bold text-lg">Plano Enterprise</h3>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">RECOMENDADO</Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-0.5">Volume ilimitado, API dedicada, SLA 99.9% e gerente de conta.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-border">Falar com vendas</Button>
              <Button className="bg-primary text-primary-foreground">
                Ver planos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta }: { icon: any; label: string; value: string; delta: string }) {
  return (
    <Card className="border-border bg-card p-5 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{delta}</span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 tabular-nums">
        {n}
      </div>
      <div>
        <p className="text-foreground font-semibold text-sm">{title}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
