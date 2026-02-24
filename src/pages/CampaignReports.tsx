import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  TrendingUp, 
  Headphones, 
  Bot, 
  GitBranch,
  Clock,
  Users,
  Calendar,
  Download,
  RefreshCw,
  CheckCircle2
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
import { useCompanyId } from "@/hooks/useCompanyId";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CampaignReports = () => {
  const [period, setPeriod] = useState("7");
  const { companyId } = useCompanyId();

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ["conversations-reports", companyId, period],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(period)).toISOString();
      let query = supabase
        .from("conversations")
        .select("*")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });
      
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allConversations = [] } = useQuery({
    queryKey: ["conversations-all-reports", companyId],
    queryFn: async () => {
      let query = supabase
        .from("conversations")
        .select("id, status, attendance_type, created_at, updated_at")
        .order("created_at", { ascending: false });
      
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const totalConversations = conversations.length;
  const agentConversations = conversations.filter(c => c.attendance_type === "agent").length;
  const aiConversations = conversations.filter(c => c.attendance_type === "ai").length;
  const uraConversations = conversations.filter(c => c.attendance_type === "ura").length;
  const openConversations = conversations.filter(c => c.status === "open").length;
  const closedConversations = conversations.filter(c => c.status === "closed").length;

  // Chart data - conversations over time
  const chartData = Array.from({ length: parseInt(period) }, (_, i) => {
    const date = subDays(new Date(), parseInt(period) - 1 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayConversations = conversations.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= dayStart && createdAt <= dayEnd;
    });

    return {
      date: format(date, "dd/MM", { locale: ptBR }),
      total: dayConversations.length,
      atendente: dayConversations.filter(c => c.attendance_type === "agent").length,
      ia: dayConversations.filter(c => c.attendance_type === "ai").length,
      ura: dayConversations.filter(c => c.attendance_type === "ura").length,
    };
  });

  // Attendance type distribution
  const typeData = [
    { name: "Atendente", value: agentConversations, color: "#10b981" },
    { name: "IA", value: aiConversations, color: "#3b82f6" },
    { name: "URA", value: uraConversations, color: "#f59e0b" },
  ].filter(s => s.value > 0);

  // Status distribution
  const statusData = [
    { name: "Abertas", value: openConversations, color: "#3b82f6" },
    { name: "Fechadas", value: closedConversations, color: "#10b981" },
    { name: "Outras", value: conversations.filter(c => c.status !== "open" && c.status !== "closed").length, color: "#8b5cf6" },
  ].filter(s => s.value > 0);

  // Hourly distribution (what hours have most conversations)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = conversations.filter(c => {
      const h = new Date(c.created_at).getHours();
      return h === hour;
    }).length;
    return { hora: `${hour.toString().padStart(2, "0")}h`, conversas: count };
  });

  const StatCard = ({ 
    title, value, subtitle, icon: Icon, trend, color = "primary" 
  }: { 
    title: string; value: string | number; subtitle?: string; icon: any; trend?: string; color?: string;
  }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
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
          <h1 className="text-3xl font-bold">Relatórios de Conversas</h1>
          <p className="text-muted-foreground">Análise detalhada dos atendimentos</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
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
          title="Total de Conversas"
          value={totalConversations}
          subtitle={`${openConversations} abertas`}
          icon={MessageSquare}
          color="primary"
        />
        <StatCard
          title="Com Atendente"
          value={agentConversations}
          subtitle="Atendimento humano"
          icon={Headphones}
          color="green-500"
        />
        <StatCard
          title="Com IA"
          value={aiConversations}
          subtitle="Atendimento automático"
          icon={Bot}
          color="blue-500"
        />
        <StatCard
          title="Na URA"
          value={uraConversations}
          subtitle="Em fluxo/formulário"
          icon={GitBranch}
          color="yellow-500"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="types">Por Tipo</TabsTrigger>
          <TabsTrigger value="hours">Por Horário</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolução de Conversas</CardTitle>
                <CardDescription>Novas conversas por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                      <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" name="Total" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipo de Atendimento</CardTitle>
                <CardDescription>Distribuição por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {typeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Nenhuma conversa encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversas por Tipo</CardTitle>
                <CardDescription>Atendente vs IA vs URA ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Legend />
                      <Bar dataKey="atendente" fill="#10b981" radius={[4, 4, 0, 0]} name="Atendente" />
                      <Bar dataKey="ia" fill="#3b82f6" radius={[4, 4, 0, 0]} name="IA" />
                      <Bar dataKey="ura" fill="#f59e0b" radius={[4, 4, 0, 0]} name="URA" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status das Conversas</CardTitle>
                <CardDescription>Abertas vs Fechadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                      Nenhuma conversa encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversas por Horário</CardTitle>
              <CardDescription>Distribuição ao longo do dia (últimos {period} dias)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hora" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Bar dataKey="conversas" fill="#10b981" radius={[4, 4, 0, 0]} name="Conversas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignReports;
