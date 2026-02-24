import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Sparkles, Zap, ArrowRight, Rocket, Target, BarChart3, Users, Calendar, FileText, TrendingUp, MessageSquare, FlaskConical, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import robotImage from "@/assets/marketflow-robot.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealTimeMetrics } from "@/components/dashboard/RealTimeMetrics";
import { ABTesting } from "@/components/mass-sending/ABTesting";
import { useTheme } from "@/hooks/useTheme";
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const floatAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

interface Stats {
  totalCampaigns: number;
  messagesSent: number;
  totalContacts: number;
  deliveryRate: number;
  openConversations: number;
  activeConnections: number;
  totalFlows: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { partnerBranding } = useTheme();
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    messagesSent: 0,
    totalContacts: 0,
    deliveryRate: 0,
    openConversations: 0,
    activeConnections: 0,
    totalFlows: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const [campaignsRes, leadsRes, conversationsRes, connectionsRes, flowsRes] = await Promise.all([
          supabase.from("campaigns").select("*").eq("user_id", userData.user.id),
          supabase.from("leads").select("id").eq("user_id", userData.user.id),
          supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "connected"),
          supabase.from("flows").select("id", { count: "exact", head: true }),
        ]);

        const campaigns = campaignsRes.data || [];
        const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
        const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
        const deliveryRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent) * 100 : 0;

        setStats({
          totalCampaigns: campaigns.length,
          messagesSent: totalSent,
          totalContacts: leadsRes.data?.length || 0,
          deliveryRate: Math.round(deliveryRate),
          openConversations: conversationsRes.count || 0,
          activeConnections: connectionsRes.count || 0,
          totalFlows: flowsRes.count || 0,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      title: "Disparos em Massa",
      description: "Envie campanhas personalizadas para milhares de contatos",
      icon: Send,
      to: "/mass-sending",
      gradient: "from-primary to-primary/70",
      metrics: "Ilimitado",
    },
    {
      title: "Relatórios",
      description: "Acompanhe métricas detalhadas de suas campanhas",
      icon: BarChart3,
      to: "/campaign-reports",
      gradient: "from-primary/80 to-primary/50",
      metrics: `${stats.totalCampaigns} campanhas`,
    },
    {
      title: "Segmentação",
      description: "Segmente contatos por tags e comportamento",
      icon: Users,
      to: "/segmentation",
      gradient: "from-primary/90 to-primary/60",
      metrics: `${stats.totalContacts} contatos`,
    },
  ];

  const capabilities = [
    {
      icon: Target,
      title: "Segmentação Avançada",
      description: "Alcance o público certo com precisão",
    },
    {
      icon: Zap,
      title: "Velocidade",
      description: "Dispare milhares de mensagens em segundos",
    },
    {
      icon: BarChart3,
      title: "Relatórios",
      description: "Acompanhe métricas em tempo real",
    },
    {
      icon: Calendar,
      title: "Agendamento",
      description: "Programe campanhas com calendário visual",
    },
  ];

  const statsCards = [
    { label: "Campanhas", value: stats.totalCampaigns, icon: Rocket, color: "text-primary" },
    { label: "Mensagens Enviadas", value: stats.messagesSent.toLocaleString(), icon: MessageSquare, color: "text-primary/80" },
    { label: "Conversas Abertas", value: stats.openConversations, icon: Activity, color: "text-primary/70" },
    { label: "Conexões Ativas", value: stats.activeConnections, icon: Zap, color: "text-primary/90" },
    { label: "Taxa de Entrega", value: `${stats.deliveryRate}%`, icon: TrendingUp, color: "text-primary/70" },
    { label: "Contatos", value: stats.totalContacts.toLocaleString(), icon: Users, color: "text-primary/60" },
  ];

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4"
            >
              <Sparkles className="w-4 h-4" />
              Plataforma de Marketing & Automação
            </motion.div>
            
            <motion.h1 
              className="text-4xl lg:text-5xl font-bold text-foreground mb-4"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Potencialize com{" "}
              <span className="text-primary">
                Disparos em Massa
              </span>
            </motion.h1>
            <motion.p 
              className="text-lg text-muted-foreground mb-6 max-w-xl"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Alcance milhares de clientes com campanhas personalizadas, templates prontos e relatórios detalhados.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/mass-sending')}
                className="group"
              >
                <Rocket className="mr-2 w-5 h-5" />
                Criar Campanha
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/campaign-reports')}
                className="group border-primary/30 hover:bg-primary/10"
              >
                <BarChart3 className="mr-2 w-5 h-5" />
                Ver Relatórios
              </Button>
            </motion.div>
          </div>

          {/* Robot Image - only show for main MarketFlow */}
          {!partnerBranding && (
            <motion.div 
              className="flex-shrink-0"
              animate={floatAnimation}
            >
              <motion.img 
                src={robotImage} 
                alt="MarketFlow Robot"
                className="w-64 h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                whileHover={{ scale: 1.05, rotate: 2 }}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <Card className="p-5 border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tabs for Real-time Metrics and A/B Testing */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="metrics" className="gap-2">
              <Activity className="w-4 h-4" />
              Métricas em Tempo Real
            </TabsTrigger>
            <TabsTrigger value="ab-testing" className="gap-2">
              <FlaskConical className="w-4 h-4" />
              Testes A/B
            </TabsTrigger>
          </TabsList>
          <TabsContent value="metrics">
            <RealTimeMetrics />
          </TabsContent>
          <TabsContent value="ab-testing">
            <ABTesting />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Main Features */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Recursos Principais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                onClick={() => navigate(feature.to)}
                className="relative overflow-hidden p-6 hover:shadow-xl transition-all cursor-pointer group border-border/50 bg-card/80 backdrop-blur-sm h-full"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className="relative">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg w-fit mb-4`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {feature.metrics}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <Button variant="ghost" size="sm" className="group/btn -ml-2">
                    Acessar
                    <ArrowRight className="ml-1 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Capabilities Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Por que escolher nossa plataforma?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((cap, index) => (
            <motion.div
              key={cap.title}
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <Card className="p-5 h-full border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <cap.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{cap.title}</h3>
                <p className="text-sm text-muted-foreground">{cap.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden p-8 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/5">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-4"
            >
              <div className="p-4 rounded-2xl bg-primary shadow-lg">
                <Rocket className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Pronto para começar?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crie sua primeira campanha de disparos e alcance milhares de clientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/mass-sending')} size="lg">
                <Send className="mr-2 w-5 h-5" />
                Criar Campanha
              </Button>
              <Button onClick={() => navigate('/campaign-reports')} variant="outline" size="lg">
                <BarChart3 className="mr-2 w-5 h-5" />
                Ver Relatórios
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
