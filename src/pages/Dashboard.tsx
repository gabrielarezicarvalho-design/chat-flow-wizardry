import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Send, Sparkles, Zap, ArrowRight, Brain, Rocket, Target, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAgents } from "@/hooks/useAgents";
import { motion } from "framer-motion";
import robotImage from "@/assets/marketflow-robot.png";

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
  const { agents } = useAgents();

  const activeAgents = agents.filter(a => a.status === 'active').length;

  const features = [
    {
      title: "Agentes de IA",
      description: "Configure agentes inteligentes para automatizar atendimentos",
      icon: Bot,
      to: "/agents",
      gradient: "from-violet-500 to-purple-600",
      metrics: `${activeAgents} ativos`,
    },
    {
      title: "Disparos em Massa",
      description: "Envie campanhas personalizadas para milhares de contatos",
      icon: Send,
      to: "/mass-sending",
      gradient: "from-blue-500 to-cyan-500",
      metrics: "Ilimitado",
    },
  ];

  const capabilities = [
    {
      icon: Brain,
      title: "IA Avançada",
      description: "Modelos de última geração para respostas inteligentes",
    },
    {
      icon: Target,
      title: "Segmentação",
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
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl" />
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
              Plataforma de IA & Automação
            </motion.div>
            
            <motion.h1 
              className="text-4xl lg:text-5xl font-bold text-foreground mb-4"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Potencialize com{" "}
              <span className="bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent">
                Inteligência Artificial
              </span>
            </motion.h1>
            <motion.p 
              className="text-lg text-muted-foreground mb-6 max-w-xl"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Automatize atendimentos com IA avançada e alcance milhares de clientes com disparos em massa inteligentes.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/agents')}
                className="group bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
              >
                <Bot className="mr-2 w-5 h-5" />
                Criar Agente IA
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/mass-sending')}
                className="group border-primary/30 hover:bg-primary/10"
              >
                <Rocket className="mr-2 w-5 h-5" />
                Disparos em Massa
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

      {/* Main Features */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Recursos Principais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                
                <div className="relative flex items-start gap-5">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
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
        <Card className="relative overflow-hidden p-8 border-primary/20 bg-gradient-to-br from-primary/5 via-violet-500/5 to-blue-500/5">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-4"
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg">
                <Rocket className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Pronto para começar?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Configure seu primeiro agente de IA ou inicie uma campanha de disparos agora mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/agents')} size="lg">
                <Bot className="mr-2 w-5 h-5" />
                Configurar Agente
              </Button>
              <Button onClick={() => navigate('/mass-sending')} variant="outline" size="lg">
                <Send className="mr-2 w-5 h-5" />
                Criar Campanha
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
