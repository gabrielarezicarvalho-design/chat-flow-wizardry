import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Sparkles, TrendingUp, UserPlus, Eye, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";
import { useLeads } from "@/hooks/useLeads";
import { useAgents } from "@/hooks/useAgents";
import { motion } from "framer-motion";
import robotImage from "@/assets/marketflow-robot.png";

const quickActions = [
  {
    title: "Criar Agente",
    description: "Configure um novo agente de IA",
    icon: UserPlus,
    to: "/create-agent",
  },
  {
    title: "Ver Conversas",
    description: "Acompanhe conversas em tempo real",
    icon: MessageSquare,
    to: "/conversations",
  },
  {
    title: "Gerenciar Leads",
    description: "Visualize e organize seus leads",
    icon: Eye,
    to: "/leads",
  },
];

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { conversations } = useConversations();
  const { leads } = useLeads();
  const { agents } = useAgents();

  // Conversas abertas = in_attendance + waiting (não inclui closed/histórico)
  const openConversations = conversations.filter(c => 
    c.status === 'in_attendance' || c.status === 'waiting' || c.status === 'in_queue'
  ).length;
  const totalConversations = conversations.length;
  const totalLeads = leads.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;

  const metrics = [
    {
      title: "Conversas Abertas",
      value: openConversations.toString(),
      icon: MessageSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Leads Captados",
      value: totalLeads.toString(),
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Agentes Ativos",
      value: activeAgents.toString(),
      icon: Sparkles,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Total de Conversas",
      value: totalConversations.toString(),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section with Robot */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <motion.h1 
              className="text-4xl lg:text-5xl font-bold text-foreground mb-4"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Bem-vindo ao{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                MarketFlow
              </span>
            </motion.h1>
            <motion.p 
              className="text-lg text-muted-foreground mb-6 max-w-xl"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Automatize seu atendimento com inteligência artificial e transforme leads em clientes satisfeitos.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/conversations')}
                className="group"
              >
                Começar Agora
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>

          {/* Robot Image */}
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
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
      >
        {metrics.map((metric, index) => (
          <motion.div key={metric.title} variants={itemVariants}>
            <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{metric.title}</p>
                  <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-bold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                onClick={() => navigate(action.to)}
                className="p-6 hover:shadow-lg transition-all cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <action.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-foreground mb-4">Atividade Recente</h2>
          <div className="text-center py-8">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-muted-foreground">
                As atividades aparecerão aqui quando você começar a usar o sistema
              </p>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
