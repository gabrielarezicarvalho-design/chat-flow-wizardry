import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, 
  MousePointer, 
  TrendingUp, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  RefreshCw
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface RealtimeStats {
  openRate: number;
  clickRate: number;
  conversionRate: number;
  totalSent: number;
  delivered: number;
  failed: number;
  pending: number;
}

interface TimeSeriesData {
  time: string;
  opens: number;
  clicks: number;
  conversions: number;
}

export function RealTimeMetrics() {
  const [stats, setStats] = useState<RealtimeStats>({
    openRate: 0,
    clickRate: 0,
    conversionRate: 0,
    totalSent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      // Fetch campaign contacts for detailed delivery stats
      const { data: campaignContacts } = await supabase
        .from("campaign_contacts")
        .select("status, sent_at, campaign_id")
        .eq("user_id", userData.user.id);

      if (campaigns) {
        const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
        const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
        const delivered = totalSent - totalFailed;
        const pending = campaigns.filter(c => c.status === "pending" || c.status === "scheduled").length;

        // Calculate real delivery rate
        const contacts = campaignContacts || [];
        const totalContacts = contacts.length;
        const sentContacts = contacts.filter(c => c.status === "sent").length;
        const failedContacts = contacts.filter(c => c.status === "failed").length;
        const pendingContacts = contacts.filter(c => c.status === "pending").length;

        const deliveryRate = totalContacts > 0 ? ((sentContacts) / totalContacts) * 100 : 0;
        const failRate = totalContacts > 0 ? ((failedContacts) / totalContacts) * 100 : 0;

        setStats({
          openRate: Math.round(deliveryRate * 10) / 10,
          clickRate: totalContacts > 0 ? Math.round((1 - failRate / 100) * 100 * 10) / 10 : 0,
          conversionRate: totalContacts > 0 ? Math.round((sentContacts / Math.max(totalContacts, 1)) * 100 * 10) / 10 : 0,
          totalSent: totalSent || sentContacts,
          delivered: delivered || sentContacts,
          failed: totalFailed || failedContacts,
          pending: pending || pendingContacts,
        });

        // Generate time series from real sent_at data (last 60 min)
        const now = new Date();
        const newTimeSeriesData: TimeSeriesData[] = [];
        for (let i = 11; i >= 0; i--) {
          const slotStart = new Date(now.getTime() - (i + 1) * 5 * 60 * 1000);
          const slotEnd = new Date(now.getTime() - i * 5 * 60 * 1000);
          const slotContacts = contacts.filter(c => {
            if (!c.sent_at) return false;
            const sentAt = new Date(c.sent_at);
            return sentAt >= slotStart && sentAt < slotEnd;
          });
          newTimeSeriesData.push({
            time: slotEnd.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            opens: slotContacts.filter(c => c.status === "sent").length,
            clicks: slotContacts.length,
            conversions: slotContacts.filter(c => c.status === "sent").length,
          });
        }
        setTimeSeriesData(newTimeSeriesData);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Set up real-time subscription
    const channel = supabase
      .channel("campaign-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaigns",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const metrics = [
    {
      label: "Taxa de Abertura",
      value: stats.openRate,
      suffix: "%",
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      label: "Taxa de Cliques",
      value: stats.clickRate,
      suffix: "%",
      icon: MousePointer,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      gradient: "from-emerald-500 to-green-500",
    },
    {
      label: "Taxa de Conversão",
      value: stats.conversionRate,
      suffix: "%",
      icon: TrendingUp,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      gradient: "from-violet-500 to-purple-500",
    },
  ];

  const deliveryStats = [
    { label: "Enviados", value: stats.totalSent, icon: Send, color: "text-blue-500" },
    { label: "Entregues", value: stats.delivered, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Falharam", value: stats.failed, icon: XCircle, color: "text-red-500" },
    { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-orange-500" },
  ];

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Métricas em Tempo Real</h3>
          <Badge variant="outline" className="ml-2 animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            Ao vivo
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          Atualizado: {lastUpdate.toLocaleTimeString("pt-BR")}
        </span>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden p-6 border-border/50">
                <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-5`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                      <metric.icon className={`w-6 h-6 ${metric.color}`} />
                    </div>
                    <motion.span
                      key={metric.value}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-foreground"
                    >
                      {metric.value}{metric.suffix}
                    </motion.span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <Progress 
                    value={metric.value} 
                    className="h-2 mt-3"
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delivery Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {deliveryStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4 border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <motion.p
                    key={stat.value}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-xl font-bold text-foreground"
                  >
                    {stat.value.toLocaleString()}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Real-time Chart */}
      <Card className="p-6 border-border/50">
        <h4 className="text-sm font-medium text-foreground mb-4">Atividade nos últimos 60 minutos</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="time" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="opens"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorOpens)"
                name="Aberturas"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorClicks)"
                name="Cliques"
              />
              <Area
                type="monotone"
                dataKey="conversions"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorConversions)"
                name="Conversões"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Aberturas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">Cliques</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-sm text-muted-foreground">Conversões</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
