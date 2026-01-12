import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MessageSquare,
  Users,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CampaignReports = () => {
  const [period, setPeriod] = useState("7");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  // Fetch campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns, refetch } = useQuery({
    queryKey: ["campaigns-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch campaign responses
  const { data: responses = [] } = useQuery({
    queryKey: ["campaign-responses-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_responses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const filteredCampaigns = selectedCampaign === "all" 
    ? campaigns 
    : campaigns.filter(c => c.id === selectedCampaign);

  const totalCampaigns = filteredCampaigns.length;
  const totalSent = filteredCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalFailed = filteredCampaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
  const totalContacts = filteredCampaigns.reduce((acc, c) => acc + (c.total_contacts || 0), 0);
  const deliveryRate = totalContacts > 0 ? ((totalSent / totalContacts) * 100).toFixed(1) : "0";
  const totalResponses = responses.length;
  const engagementRate = totalSent > 0 ? ((totalResponses / totalSent) * 100).toFixed(1) : "0";

  // Chart data - campaigns over time
  const chartData = Array.from({ length: parseInt(period) }, (_, i) => {
    const date = subDays(new Date(), parseInt(period) - 1 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayCampaigns = campaigns.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= dayStart && createdAt <= dayEnd;
    });
    
    const dayResponses = responses.filter(r => {
      const createdAt = new Date(r.created_at);
      return createdAt >= dayStart && createdAt <= dayEnd;
    });

    return {
      date: format(date, "dd/MM", { locale: ptBR }),
      enviados: dayCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
      respostas: dayResponses.length,
      falhas: dayCampaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0),
    };
  });

  // Status distribution for pie chart
  const statusData = [
    { name: "Concluídas", value: campaigns.filter(c => c.status === "completed").length, color: "#10b981" },
    { name: "Em Andamento", value: campaigns.filter(c => c.status === "sending").length, color: "#3b82f6" },
    { name: "Pendentes", value: campaigns.filter(c => c.status === "pending").length, color: "#f59e0b" },
    { name: "Agendadas", value: campaigns.filter(c => c.status === "scheduled").length, color: "#8b5cf6" },
    { name: "Falhas", value: campaigns.filter(c => c.status === "failed").length, color: "#ef4444" },
  ].filter(s => s.value > 0);

  // Response type distribution
  const responseTypeData = [
    { name: "Positivas", value: responses.filter(r => r.response_type === "positive").length },
    { name: "Negativas", value: responses.filter(r => r.response_type === "negative").length },
    { name: "Neutras", value: responses.filter(r => r.response_type === "neutral" || !r.response_type).length },
  ].filter(r => r.value > 0);

  // Top campaigns by engagement
  const topCampaigns = [...campaigns]
    .map(c => ({
      ...c,
      engagement: c.sent_count && c.sent_count > 0 
        ? (responses.filter(r => r.campaign_id === c.id).length / c.sent_count) * 100 
        : 0
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = "primary" 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: any; 
    trend?: string;
    color?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <h3 className="text-3xl font-bold mt-1">{value}</h3>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
              {trend && (
                <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {trend}
                </Badge>
              )}
            </div>
            <div className={`p-3 rounded-xl bg-${color}/10`}>
              <Icon className={`w-6 h-6 text-${color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Campanhas</h1>
          <p className="text-muted-foreground">Análise detalhada de desempenho e engajamento</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as campanhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Campanhas"
          value={totalCampaigns}
          subtitle="Campanhas criadas"
          icon={BarChart3}
          color="primary"
        />
        <StatCard
          title="Mensagens Enviadas"
          value={totalSent.toLocaleString()}
          subtitle={`${totalFailed} falhas`}
          icon={Send}
          color="green-500"
        />
        <StatCard
          title="Taxa de Entrega"
          value={`${deliveryRate}%`}
          subtitle="Mensagens entregues"
          icon={CheckCircle2}
          trend="+5.2%"
          color="blue-500"
        />
        <StatCard
          title="Taxa de Engajamento"
          value={`${engagementRate}%`}
          subtitle={`${totalResponses} respostas`}
          icon={MessageSquare}
          color="purple-500"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="campaigns">Por Campanha</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolução de Envios</CardTitle>
                <CardDescription>Mensagens enviadas e respostas recebidas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRespostas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="enviados"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorEnviados)"
                        name="Enviados"
                      />
                      <Area
                        type="monotone"
                        dataKey="respostas"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorRespostas)"
                        name="Respostas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart - Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status das Campanhas</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Nenhuma campanha encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart - Response Types */}
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Resposta</CardTitle>
                <CardDescription>Classificação das respostas recebidas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {responseTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={responseTypeData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                        />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Nenhuma resposta encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Top Campanhas</CardTitle>
                <CardDescription>Campanhas com maior engajamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCampaigns.length > 0 ? topCampaigns.map((campaign, index) => (
                    <div key={campaign.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.sent_count || 0} enviados
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {campaign.engagement.toFixed(1)}%
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma campanha com engajamento
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Campanha</CardTitle>
              <CardDescription>Comparativo de todas as campanhas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {campaigns.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={campaigns.slice(0, 10).map(c => ({
                        name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
                        enviados: c.sent_count || 0,
                        falhas: c.failed_count || 0,
                        total: c.total_contacts || 0,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Legend />
                      <Bar dataKey="enviados" fill="#10b981" name="Enviados" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="falhas" fill="#ef4444" name="Falhas" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhuma campanha encontrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignReports;