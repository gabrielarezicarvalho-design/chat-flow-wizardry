import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLeads } from "@/hooks/useLeads";
import { useCompanyId } from "@/hooks/useCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  UserRound,
  Target,
  Settings as SettingsIcon,
  Filter,
  UserPlus,
  Sparkles,
  Filter as FilterIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";


const StatCard = ({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) => (
  <Card className="bg-card/60 border-border/60">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

export default function Vendas() {
  const { leads } = useLeads();
  const { companyId } = useCompanyId();
  const [signMessages, setSignMessages] = useState(true);
  const [format, setFormat] = useState("*{nome}*:\n{msg}");
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [lockConversation, setLockConversation] = useState(true);
  const [sla, setSla] = useState(30);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      setLoadingSettings(true);
      const { data, error } = await supabase
        .from("sales_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast.error("Erro ao carregar configurações");
      } else if (data) {
        setSignMessages(data.sign_messages);
        setFormat(data.message_format);
        setAutoDistribute(data.auto_distribute);
        setLockConversation(data.lock_conversation);
        setSla(data.sla_minutes);
      }
      setLoadingSettings(false);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  const handleSaveSettings = async () => {
    if (!companyId) {
      toast.error("Nenhuma empresa vinculada ao usuário");
      return;
    }
    setSavingSettings(true);
    const { error } = await supabase
      .from("sales_settings")
      .upsert(
        {
          company_id: companyId,
          sign_messages: signMessages,
          message_format: format,
          auto_distribute: autoDistribute,
          lock_conversation: lockConversation,
          sla_minutes: sla,
        },
        { onConflict: "company_id" }
      );
    setSavingSettings(false);
    if (error) {
      toast.error(error.message || "Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas!");
    }
  };


  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l: any) => l.status === "converted").length;
    const contacted = leads.filter((l: any) => l.status === "contacted").length;
    const newLeads = leads.filter((l: any) => l.status === "new").length;
    return { total, converted, contacted, newLeads };
  }, [leads]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gerenciador de Vendas
          </h1>
          <p className="text-muted-foreground">
            Distribua leads e acompanhe a performance do seu time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <UserPlus className="w-4 h-4 mr-2" />
            Distribuir Leads
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-card/60 border border-border/60">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="distribuicao" className="gap-2">
            <Users className="w-4 h-4" /> Distribuição
          </TabsTrigger>
          <TabsTrigger value="por-vendedor" className="gap-2">
            <UserRound className="w-4 h-4" /> Por Vendedor
          </TabsTrigger>
          <TabsTrigger value="meus-leads" className="gap-2">
            <Target className="w-4 h-4" /> Meus Leads
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2">
            <SettingsIcon className="w-4 h-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total de Leads" value={stats.total} icon={Target} />
            <StatCard label="Novos" value={stats.newLeads} icon={Sparkles} />
            <StatCard label="Contatados" value={stats.contacted} icon={Clock} />
            <StatCard
              label="Convertidos"
              value={stats.converted}
              icon={CheckCircle2}
              hint={
                stats.total
                  ? `${((stats.converted / stats.total) * 100).toFixed(1)}% de conversão`
                  : "—"
              }
            />
          </div>
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Performance do time</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Convide vendedores em <span className="font-medium">Equipe</span>{" "}
                e marque a permissão "sales" para visualizar métricas
                individuais.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribuição */}
        <TabsContent value="distribuicao">
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Nova Distribuição</h2>
                <p className="text-sm text-muted-foreground">
                  Escolha como deseja distribuir novos leads para sua equipe.
                </p>
              </div>

              <div className="rounded-lg border border-dashed border-border/60 p-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem vendedores com permissão de{" "}
                  <span className="font-medium text-foreground">Vendas</span>.
                  Convide alguém em{" "}
                  <span className="font-medium text-foreground">Equipe</span> e
                  marque a permissão "sales" para começar a distribuir leads.
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/users">Ir para Equipe</Link>
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">
                  Outros Modos de Distribuição
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Rodízio Automático (Round-Robin)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Distribui igualmente entre todos online.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <FilterIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Distribuição por Regras
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Baseado em cidade, estado ou DDD.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Vendedor */}
        <TabsContent value="por-vendedor">
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhum vendedor com permissão de Vendas ou Chat. Convide alguém em{" "}
              <span className="font-medium text-foreground">Equipe</span>.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meus Leads */}
        <TabsContent value="meus-leads">
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6 space-y-2">
              <h2 className="text-xl font-semibold">Meus Leads Atribuídos</h2>
              <p className="text-sm text-muted-foreground">
                Leads que você deve entrar em contato e converter.
              </p>
              <div className="py-16 text-center text-sm text-muted-foreground">
                Você ainda não recebeu nenhum lead.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="configuracoes">
          <Card className="bg-card/60 border-border/60">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Configurações do time</h2>
                  <p className="text-sm text-muted-foreground">
                    Como o sistema se comporta quando há vários vendedores.
                  </p>
                </div>
                {loadingSettings && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>


              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Assinar mensagens no WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Cliente vê quem está respondendo (ex: *João:*).
                  </p>
                </div>
                <Switch
                  checked={signMessages}
                  onCheckedChange={setSignMessages}
                />
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Textarea
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {"{nome}"} e {"{msg}"}. Use Enter pra quebra de
                  linha (evite mais de 1 linha em branco).
                </p>
                <div className="rounded-md border border-border/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Preview
                  </p>
                  <p>
                    <span className="font-bold">*João*:</span>
                    <br />
                    Bom dia! Tudo certo com a proposta?
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    Distribuição automática (round-robin)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Atribui leads novos em rodízio entre vendedores com
                    permissão de Vendas.
                  </p>
                </div>
                <Switch
                  checked={autoDistribute}
                  onCheckedChange={setAutoDistribute}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Travar conversa em uso</p>
                  <p className="text-xs text-muted-foreground">
                    Quando A está atendendo, B não consegue mandar mensagem
                    (evita resposta duplicada).
                  </p>
                </div>
                <Switch
                  checked={lockConversation}
                  onCheckedChange={setLockConversation}
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label>SLA: alerta após X minutos sem resposta</Label>
                <Input
                  type="number"
                  value={sla}
                  onChange={(e) => setSla(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Conversas onde o lead falou e o vendedor não respondeu após
                  esse tempo ficam destacadas.
                </p>
              </div>

              <Button className="bg-primary hover:bg-primary/90">
                Salvar configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
