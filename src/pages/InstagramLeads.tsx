import { useState, useEffect, useRef } from "react";
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
  Instagram,
  Sparkles,
  Zap,
  Target,
  Shield,
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
  Trophy,
  Flame,
  Crown,
  ArrowRight,
  AlertCircle,
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
  const Icon = current.icon;
  const estimatedPhones = Math.round(quantity * 0.3);

  return (
    <div className="min-h-screen bg-[#0a0416] p-4 md:p-8">
      {/* Hero */}
      <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-[#1a0b2e] via-[#0f0721] to-[#1a0b2e] p-8 md:p-12 mb-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-0" />

        <div className="relative z-10 grid lg:grid-cols-3 gap-8">
          {/* Left title */}
          <div className="lg:col-span-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-pink-500/30">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Gerador de<br />Leads{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                Instagram
              </span>
            </h1>
            <p className="text-white/70 mt-4 max-w-lg">
              Encontre perfis qualificados no Instagram e gere leads prontos para vender mais!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-2xl">
              <FeaturePill icon={Target} title="Mais Precisão" desc="Encontre o público certo para seu negócio" color="pink" />
              <FeaturePill icon={Zap} title="Mais Agilidade" desc="Extraia leads em segundos" color="yellow" />
              <FeaturePill icon={Shield} title="Mais Resultados" desc="Conecte, encante e venda mais!" color="blue" />
            </div>
          </div>

          {/* Right: how it works */}
          <div>
            <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 border-purple-500/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span className="text-white font-semibold text-sm">Como funciona?</span>
              </div>
              <div className="space-y-4">
                <Step n={1} title="Defina os filtros" desc="Segmento, cidade e quantidade" />
                <Step n={2} title="Buscamos no Instagram" desc="Nosso sistema encontra os melhores perfis" />
                <Step n={3} title="Leads prontos para uso" desc="Baixe ou conecte seu CRM e comece a vender!" />
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Warning */}
      <Card className="bg-amber-500/10 border-amber-500/30 p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-100">
          <strong>Aviso importante:</strong> nem todos os perfis públicos do Instagram exibem telefone. Em média,{" "}
          <strong>~30%</strong> dos perfis processados têm telefone visível na bio. Você paga pelos{" "}
          <strong>perfis processados</strong>, não pelos com telefone.
        </div>
      </Card>

      {/* Extraction panel */}
      <Card className="relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-[#1a0b2e] to-[#0f0721] p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Gerador de Leads Instagram
          </h2>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as ExtractionMode)} className="w-full">
          <TabsList className="grid grid-cols-4 bg-purple-950/40 border border-purple-500/20 p-1 h-auto">
            {(Object.keys(modeConfig) as ExtractionMode[]).map((k) => {
              const Ic = modeConfig[k].icon;
              return (
                <TabsTrigger
                  key={k}
                  value={k}
                  className="data-[state=active]:bg-purple-900/80 data-[state=active]:text-white text-white/60 py-2.5 gap-2"
                >
                  <Ic className="w-4 h-4" />
                  <span className="hidden sm:inline">{modeConfig[k].label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={mode} className="mt-6 space-y-5">
            <div>
              <Label className="text-white/80 mb-2 block">{current.label}</Label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={current.placeholder}
                className="bg-purple-950/40 border-purple-500/30 text-white placeholder:text-white/40 h-12"
              />
              <p className="text-xs text-white/50 mt-2">{current.hint}</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-white/80">Quantos perfis extrair?</Label>
                <span className="text-white font-bold text-lg">{quantity}</span>
              </div>
              <Slider
                value={[quantity]}
                onValueChange={(v) => setQuantity(v[0])}
                min={10}
                max={500}
                step={10}
                className="[&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-300"
              />
              <div className="flex justify-between text-xs text-white/50 mt-2">
                <span>Custo: {quantity} créditos</span>
                <span className="text-pink-400">Estimativa: ~{estimatedPhones} perfis com telefone</span>
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/30 border-0"
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
        <StatCard icon={Users} value="+2.5M" label="Perfis encontrados" sub="Busca inteligente e precisa" gradient="from-purple-500 to-pink-500" />
        <StatCard icon={Target} value="98.7%" label="Precisão dos filtros" sub="Leads altamente qualificados" gradient="from-pink-500 to-orange-500" />
        <StatCard icon={Zap} value="6.2s" label="Tempo médio" sub="Resultados em segundos" gradient="from-yellow-500 to-orange-500" />
        <StatCard icon={Download} value="100%" label="Exportável" sub="Baixe ou integre ao CRM" gradient="from-blue-500 to-purple-500" />
      </div>

      {/* Popular + Tip */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-[#1a0b2e] to-[#0f0721] border-purple-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-white font-semibold">Buscas populares</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => setInputValue(s)}
                className="px-4 py-1.5 rounded-full border border-purple-500/30 text-white/80 text-sm hover:bg-purple-500/20 hover:border-purple-400 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/20 border-purple-500/30 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold">Dica de ouro</h3>
          </div>
          <p className="text-white/70 text-sm">
            Seja específico no segmento para encontrar os melhores leads!
          </p>
        </Card>
      </div>

      {/* Results */}
      {leads.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a0b2e] to-[#0f0721] border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-lg">
              {leads.length} perfis encontrados
            </h3>
            <div className="flex gap-2">
              <Button onClick={exportCSV} variant="outline" className="border-purple-500/30 text-white hover:bg-purple-500/20">
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
              <Button onClick={saveAll} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                Salvar todos
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {leads.map((l, i) => (
              <Card key={i} className="bg-purple-950/30 border-purple-500/20 p-4 hover:border-pink-500/50 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {l.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold truncate">@{l.username}</p>
                      {l.is_business && <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-xs">Business</Badge>}
                    </div>
                    {l.full_name && <p className="text-white/70 text-sm truncate">{l.full_name}</p>}
                    {l.followers !== undefined && (
                      <p className="text-white/50 text-xs mt-1">{l.followers.toLocaleString("pt-BR")} seguidores</p>
                    )}
                    {l.bio && <p className="text-white/60 text-xs mt-2 line-clamp-2">{l.bio}</p>}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {l.phone && <Badge variant="outline" className="border-green-500/30 text-green-300 text-xs"><Phone className="w-3 h-3 mr-1" />{l.phone}</Badge>}
                      {l.website && <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-xs"><Globe className="w-3 h-3 mr-1" />site</Badge>}
                      {l.city && <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs"><MapPin className="w-3 h-3 mr-1" />{l.city}</Badge>}
                    </div>

                    <Button
                      onClick={() => saveLead(l)}
                      size="sm"
                      className="mt-3 w-full bg-purple-600/50 hover:bg-purple-600 text-white text-xs"
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
      <Card className="mt-6 relative overflow-hidden border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-6">
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
          <Button className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg rounded-full px-6">
            Ver planos <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FeaturePill({ icon: Icon, title, desc, color }: any) {
  const colorMap: Record<string, string> = {
    pink: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-white font-semibold text-sm">{title}</p>
      <p className="text-white/60 text-xs mt-0.5">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {n}
      </div>
      <div>
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-white/60 text-xs">{desc}</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, sub, gradient }: any) {
  return (
    <Card className="bg-gradient-to-br from-[#1a0b2e] to-[#0f0721] border-purple-500/20 p-5 hover:border-pink-500/50 hover:-translate-y-1 transition-all">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">{value}</p>
      <p className="text-white font-medium text-sm mt-1">{label}</p>
      <p className="text-white/50 text-xs">{sub}</p>
    </Card>
  );
}
