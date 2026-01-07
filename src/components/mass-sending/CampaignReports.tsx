import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Send, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Sparkles,
  RefreshCw,
  Lightbulb,
  Target,
  Megaphone,
  Clock,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Brain
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

interface Campaign {
  id: string;
  name: string;
  status: string;
  message_type: string;
  message_content: string | null;
  total_contacts: number;
  sent_count: number | null;
  failed_count: number | null;
  created_at: string;
  completed_at: string | null;
}

interface CampaignResponse {
  id: string;
  campaign_id: string | null;
  contact_phone: string;
  response_type: string | null;
  response_value: string | null;
  response_text: string | null;
  created_at: string | null;
}

interface AIInsight {
  type: "idea" | "remarketing" | "optimization";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function CampaignReports() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [responses, setResponses] = useState<CampaignResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const [campaignsRes, responsesRes] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("campaign_responses")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
      ]);

      setCampaigns((campaignsRes.data as Campaign[]) || []);
      setResponses((responsesRes.data as CampaignResponse[]) || []);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const generateAIInsights = async () => {
    if (campaigns.length === 0) {
      toast.error("Nenhuma campanha encontrada para análise");
      return;
    }

    setLoadingAI(true);
    try {
      const campaignSummary = campaigns.map(c => ({
        name: c.name,
        type: c.message_type,
        status: c.status,
        total: c.total_contacts,
        sent: c.sent_count || 0,
        failed: c.failed_count || 0,
        successRate: c.total_contacts > 0 ? Math.round(((c.sent_count || 0) / c.total_contacts) * 100) : 0,
        content: c.message_content?.substring(0, 200),
        date: c.created_at
      }));

      const responseSummary = {
        total: responses.length,
        buttonClicks: responses.filter(r => r.response_type === "button_click").length,
        textResponses: responses.filter(r => r.response_type === "text").length
      };

      const { data, error } = await supabase.functions.invoke("campaign-ai-insights", {
        body: {
          campaigns: campaignSummary,
          responses: responseSummary
        }
      });

      if (error) throw error;

      if (data?.insights) {
        setAiInsights(data.insights);
        toast.success("Análise de IA concluída!");
      }
    } catch (err) {
      console.error("Error generating AI insights:", err);
      toast.error("Erro ao gerar insights de IA");
    }
    setLoadingAI(false);
  };

  // Calculate metrics
  const totalCampaigns = campaigns.length;
  const totalContacts = campaigns.reduce((sum, c) => sum + (c.total_contacts || 0), 0);
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + (c.failed_count || 0), 0);
  const avgSuccessRate = totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 0;
  const totalResponses = responses.length;
  const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;

  // Calculate campaign trends (last 7 days vs previous 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentCampaigns = campaigns.filter(c => new Date(c.created_at) >= sevenDaysAgo);
  const previousCampaigns = campaigns.filter(c => {
    const date = new Date(c.created_at);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  });

  const campaignTrend = recentCampaigns.length - previousCampaigns.length;

  // Prepare chart data
  const statusData = [
    { name: "Enviadas", value: campaigns.filter(c => c.status === "sent").length, color: COLORS[0] },
    { name: "Pendentes", value: campaigns.filter(c => c.status === "pending").length, color: COLORS[1] },
    { name: "Agendadas", value: campaigns.filter(c => c.status === "scheduled").length, color: COLORS[2] },
    { name: "Falhas", value: campaigns.filter(c => c.status === "failed").length, color: COLORS[3] }
  ].filter(d => d.value > 0);

  const messageTypeData = [
    { name: "Texto", value: campaigns.filter(c => c.message_type === "text").length },
    { name: "Imagem", value: campaigns.filter(c => c.message_type === "image").length },
    { name: "Vídeo", value: campaigns.filter(c => c.message_type === "video").length },
    { name: "Documento", value: campaigns.filter(c => c.message_type === "document").length },
    { name: "Interativo", value: campaigns.filter(c => c.message_type?.includes("interactive")).length }
  ].filter(d => d.value > 0);

  // Daily campaign data for line chart (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayCampaigns = campaigns.filter(c => c.created_at.startsWith(dateStr));
    const dayResponses = responses.filter(r => r.created_at?.startsWith(dateStr));
    
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      campanhas: dayCampaigns.length,
      enviados: dayCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
      respostas: dayResponses.length
    };
  });

  // Top performing campaigns
  const topCampaigns = [...campaigns]
    .filter(c => c.total_contacts > 0)
    .sort((a, b) => {
      const rateA = ((a.sent_count || 0) / a.total_contacts) * 100;
      const rateB = ((b.sent_count || 0) / b.total_contacts) * 100;
      return rateB - rateA;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios de Campanhas</h2>
          <p className="text-muted-foreground">Métricas e análise inteligente das suas campanhas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={generateAIInsights} disabled={loadingAI}>
            {loadingAI ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Análise com IA
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCampaigns}</p>
              <p className="text-xs text-muted-foreground">Campanhas</p>
            </div>
          </div>
          {campaignTrend !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${campaignTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {campaignTrend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(campaignTrend)} vs semana anterior
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalContacts.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Contatos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFailed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgSuccessRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <MessageSquare className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalResponses}</p>
              <p className="text-xs text-muted-foreground">Respostas ({responseRate}%)</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="w-4 h-4 mr-1" />
            Insights IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Status das Campanhas
              </h3>
              {statusData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma campanha encontrada
                </div>
              )}
            </Card>

            {/* Message Types */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Tipos de Mensagem
              </h3>
              {messageTypeData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={messageTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma campanha encontrada
                </div>
              )}
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Atividade dos Últimos 30 Dias
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="campanhas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Campanhas" />
                  <Line type="monotone" dataKey="enviados" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Enviados" />
                  <Line type="monotone" dataKey="respostas" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Respostas" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          {/* Top Performing Campaigns */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Top 5 Campanhas por Performance
            </h3>
            {topCampaigns.length > 0 ? (
              <div className="space-y-4">
                {topCampaigns.map((campaign, index) => {
                  const successRate = Math.round(((campaign.sent_count || 0) / campaign.total_contacts) * 100);
                  return (
                    <div key={campaign.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.sent_count || 0} / {campaign.total_contacts} contatos
                        </p>
                      </div>
                      <div className="w-32">
                        <Progress value={successRate} className="h-2" />
                      </div>
                      <Badge variant={successRate >= 90 ? "default" : successRate >= 70 ? "secondary" : "outline"}>
                        {successRate}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma campanha com dados de performance
              </div>
            )}
          </Card>

          {/* Recent Campaigns Table */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Campanhas Recentes
            </h3>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {campaigns.slice(0, 10).map((campaign) => {
                  const successRate = campaign.total_contacts > 0 
                    ? Math.round(((campaign.sent_count || 0) / campaign.total_contacts) * 100) 
                    : 0;
                  return (
                    <div key={campaign.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(campaign.created_at).toLocaleDateString('pt-BR')} • {campaign.message_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{campaign.sent_count || 0} / {campaign.total_contacts}</p>
                        <p className="text-xs text-muted-foreground">{successRate}% sucesso</p>
                      </div>
                      <Badge variant={
                        campaign.status === "sent" ? "default" :
                        campaign.status === "failed" ? "destructive" :
                        campaign.status === "scheduled" ? "secondary" :
                        "outline"
                      }>
                        {campaign.status === "sent" ? "Enviada" :
                         campaign.status === "failed" ? "Falha" :
                         campaign.status === "scheduled" ? "Agendada" :
                         campaign.status === "pending" ? "Pendente" :
                         campaign.status}
                      </Badge>
                    </div>
                  );
                })}
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha encontrada
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Brain className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Insights de IA</h3>
                  <p className="text-sm text-muted-foreground">Ideias de campanhas e remarketing baseadas nos seus dados</p>
                </div>
              </div>
              <Button onClick={generateAIInsights} disabled={loadingAI}>
                {loadingAI ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Gerar Insights
              </Button>
            </div>

            {loadingAI ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Analisando suas campanhas com IA...</p>
              </div>
            ) : aiInsights.length > 0 ? (
              <div className="grid gap-4">
                {aiInsights.map((insight, index) => (
                  <Card 
                    key={index} 
                    className={`p-4 border-l-4 ${
                      insight.type === "idea" ? "border-l-blue-500 bg-blue-500/5" :
                      insight.type === "remarketing" ? "border-l-purple-500 bg-purple-500/5" :
                      "border-l-green-500 bg-green-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        insight.type === "idea" ? "bg-blue-500/10" :
                        insight.type === "remarketing" ? "bg-purple-500/10" :
                        "bg-green-500/10"
                      }`}>
                        {insight.type === "idea" ? <Lightbulb className="w-5 h-5 text-blue-500" /> :
                         insight.type === "remarketing" ? <Target className="w-5 h-5 text-purple-500" /> :
                         <TrendingUp className="w-5 h-5 text-green-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant={
                            insight.priority === "high" ? "destructive" :
                            insight.priority === "medium" ? "default" :
                            "secondary"
                          } className="text-xs">
                            {insight.priority === "high" ? "Alta" :
                             insight.priority === "medium" ? "Média" : "Baixa"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h4 className="font-medium mb-2">Nenhum insight gerado ainda</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em "Gerar Insights" para receber ideias de campanhas e remarketing baseadas no histórico das suas campanhas.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
