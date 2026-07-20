import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { MessageSquare, Bot, Zap, Users, TrendingUp, Shield, CheckCircle2, ArrowRight, Sparkles, Send, Star, Rocket, Globe, Clock, BarChart3 } from "lucide-react";

// Demo Chat Animation Component
const DemoChatAnimation = () => {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const messages = [{
    type: "received",
    text: "Olá! Gostaria de saber sobre o plano empresarial 👋",
    delay: 0
  }, {
    type: "sent",
    text: "Olá! Sou a assistente virtual da MarketFlow 🤖",
    delay: 1.5,
    isBot: true
  }, {
    type: "sent",
    text: "Nosso plano empresarial inclui:\n• Agentes ilimitados\n• Suporte 24/7\n• API completa",
    delay: 3,
    isBot: true
  }, {
    type: "received",
    text: "Quanto custa?",
    delay: 5
  }, {
    type: "sent",
    text: "O investimento é de R$ 497/mês. Quer agendar uma demonstração? 📅",
    delay: 6.5,
    isBot: true
  }, {
    type: "received",
    text: "Sim, por favor!",
    delay: 8
  }, {
    type: "sent",
    text: "Perfeito! Transferindo para nossa equipe comercial... ✅",
    delay: 9.5,
    isBot: true
  }];
  useEffect(() => {
    const timers: number[] = [];
    messages.forEach((msg, i) => {
      const timer = setTimeout(() => {
        setVisibleMessages(i + 1);
      }, msg.delay * 1000);
      timers.push(timer);
    });

    // Loop animation
    const resetTimer = setTimeout(() => {
      setVisibleMessages(0);
    }, 13000);
    timers.push(resetTimer);
    return () => timers.forEach(t => clearTimeout(t));
  }, [visibleMessages === 0]);
  return <div className="relative w-full max-w-md mx-auto">
      {/* Phone Frame */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[3rem] p-3 shadow-2xl shadow-blue-500/30 border border-blue-500/30">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-10" />
        
        {/* Screen */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-[2.5rem] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold">MarketFlow IA</div>
              <div className="text-blue-200 text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Online agora
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-80 p-4 space-y-3 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzBmMTcyYSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSIjMWUyOTNiIj48L2NpcmNsZT4KPC9zdmc+')] bg-repeat">
            {messages.slice(0, visibleMessages).map((msg, i) => <motion.div key={i} initial={{
            opacity: 0,
            y: 20,
            scale: 0.8
          }} animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }} transition={{
            duration: 0.3,
            type: "spring"
          }} className={`flex ${msg.type === "sent" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-line ${msg.type === "sent" ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md shadow-lg shadow-blue-500/30" : "bg-slate-700 text-white rounded-bl-md"}`}>
                  {msg.isBot && <div className="flex items-center gap-1 text-blue-300 text-xs mb-1">
                      <Bot className="w-3 h-3" />
                      <span>IA</span>
                    </div>}
                  {msg.text}
                </div>
              </motion.div>)}
            
            {/* Typing indicator */}
            {visibleMessages > 0 && visibleMessages < messages.length && messages[visibleMessages]?.type === "sent" && <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="flex justify-end">
                <div className="bg-blue-600/50 px-4 py-3 rounded-2xl rounded-br-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{
                  animationDelay: "0ms"
                }} />
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{
                  animationDelay: "150ms"
                }} />
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{
                  animationDelay: "300ms"
                }} />
                  </div>
                </div>
              </motion.div>}
          </div>

          {/* Input */}
          <div className="p-3 bg-slate-800 border-t border-slate-700">
            <div className="flex items-center gap-2 bg-slate-700 rounded-full px-4 py-2">
              <span className="text-slate-400 text-sm flex-1">Digite uma mensagem...</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
                <Send className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{
      animationDelay: '1s'
    }} />
      <div className="absolute top-1/2 -right-8 w-16 h-16 bg-blue-400/20 rounded-full blur-2xl animate-pulse" style={{
      animationDelay: '0.5s'
    }} />
    </div>;
};
const BetaLanding = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0
  });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    toast.success("🎉 Inscrição realizada com sucesso!");

    // Redirect to thank you page
    navigate("/beta-obrigado", {
      state: {
        email,
        name
      }
    });
  };
  const features = [{
    icon: Bot,
    title: "IA Conversacional",
    description: "Assistentes inteligentes que entendem e respondem como humanos",
    color: "from-blue-500 to-blue-600"
  }, {
    icon: Zap,
    title: "Automação Total",
    description: "Fluxos automatizados que trabalham 24/7 para você",
    color: "from-cyan-500 to-blue-600"
  }, {
    icon: MessageSquare,
    title: "Multi-Canal",
    description: "WhatsApp, Instagram, Telegram em uma única plataforma",
    color: "from-blue-400 to-cyan-500"
  }, {
    icon: TrendingUp,
    title: "Analytics Avançado",
    description: "Métricas e insights em tempo real do seu atendimento",
    color: "from-blue-600 to-blue-700"
  }, {
    icon: Users,
    title: "Gestão de Equipe",
    description: "Distribua atendimentos e monitore sua equipe",
    color: "from-cyan-400 to-blue-500"
  }, {
    icon: Shield,
    title: "Segurança Total",
    description: "Dados criptografados e conformidade com LGPD",
    color: "from-blue-500 to-cyan-600"
  }];
  const testimonials = [{
    name: "Carlos Silva",
    company: "TechStore",
    text: "Reduzimos 70% do tempo de resposta com o MarketFlow",
    rating: 5
  }, {
    name: "Ana Beatriz",
    company: "Clínica Vida",
    text: "A automação de agendamentos transformou nossa operação",
    rating: 5
  }, {
    name: "Roberto Santos",
    company: "AutoPeças Express",
    text: "Atendemos 3x mais clientes com a mesma equipe",
    rating: 5
  }];
  const stats = [{
    icon: Rocket,
    value: "10x",
    label: "mais produtividade"
  }, {
    icon: Clock,
    value: "24/7",
    label: "disponibilidade"
  }, {
    icon: BarChart3,
    value: "70%",
    label: "redução de custos"
  }, {
    icon: Globe,
    value: "1000+",
    label: "empresas atendidas"
  }];
  return <>
      <Helmet>
        <title>Next Pro Chat Beta | Automatize seu WhatsApp com IA</title>
        <meta name="description" content="Inscreva-se no beta exclusivo do Next Pro Chat. Automatize conversas, capture leads e escale seu atendimento com Inteligência Artificial." />
        <meta property="og:title" content="Next Pro Chat Beta | Automatize seu WhatsApp com IA" />
        <meta property="og:description" content="Seja um dos primeiros a revolucionar seu atendimento com IA. Vagas limitadas!" />
        <meta property="og:url" content="https://ia.nextpro.com.br/testar-beta" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-[#030712] text-white overflow-hidden relative">
        {/* Animated Background with Blue Theme */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[150px] transition-all duration-1000 ease-out" style={{
          background: "linear-gradient(135deg, #0066ff, #00d4ff, #0066ff)",
          left: mousePosition.x - 400,
          top: mousePosition.y - 400
        }} />
          {/* Static glows */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[150px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        {/* Floating Particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => <motion.div key={i} className="absolute w-1 h-1 bg-blue-400/50 rounded-full" style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`
        }} animate={{
          y: [0, -50, 0],
          opacity: [0.2, 0.8, 0.2],
          scale: [1, 1.5, 1]
        }} transition={{
          duration: 3 + Math.random() * 4,
          delay: Math.random() * 3,
          repeat: Infinity
        }} />)}
        </div>

        {/* Header */}
        <header className="relative z-10 py-6 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.div className="flex items-center gap-3" initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent font-['Space_Grotesk'] tracking-tight">
                  NEXT PRO&nbsp;
                </span>
                <span className="text-2xl font-light text-blue-400 ml-1">Chat</span>
              </div>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }}>
              <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 border-0 text-white px-4 py-2 text-sm shadow-lg shadow-blue-500/30">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Beta Exclusivo
              </Badge>
            </motion.div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 pt-8 pb-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <div className="text-center lg:text-left">
                <motion.div className="inline-flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-full px-5 py-2.5 mb-8" initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-sm text-blue-200 font-medium">🚀 Últimas vagas disponíveis para o programa beta</span>
                </motion.div>
                
                <motion.h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight" initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.1
              }}>
                  <span className="bg-gradient-to-r from-white via-blue-50 to-blue-100 bg-clip-text text-transparent">
                    Revolucione seu
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Atendimento
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-500 bg-clip-text text-transparent">
                    com IA
                  </span>
                </motion.h1>
                
                <motion.p className="text-xl text-blue-200/80 max-w-xl mb-10 leading-relaxed" initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.2
              }}>
                  Automatize conversas, capture leads qualificados e escale seu atendimento 
                  com a plataforma de automação mais poderosa do Brasil.
                </motion.p>

                {/* Stats */}
                <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10" initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.3
              }}>
                  {stats.map((stat, i) => <div key={i} className="text-center p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl backdrop-blur-sm hover:border-blue-500/40 transition-all duration-300 group">
                      <stat.icon className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-blue-300/60 text-xs">{stat.label}</div>
                    </div>)}
                </motion.div>

                {/* CTA Buttons */}
                <motion.div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start" initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.4
              }}>
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-6 text-lg shadow-lg shadow-blue-500/30 border-0" onClick={() => document.getElementById('form-section')?.scrollIntoView({
                  behavior: 'smooth'
                })}>
                    <Rocket className="w-5 h-5 mr-2" />
                    Garantir Minha Vaga
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10 px-8 py-6 text-lg">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Ver Demonstração
                  </Button>
                </motion.div>
              </div>

              {/* Right: Demo Animation */}
              <motion.div initial={{
              opacity: 0,
              scale: 0.9,
              x: 50
            }} animate={{
              opacity: 1,
              scale: 1,
              x: 0
            }} transition={{
              delay: 0.4,
              duration: 0.6
            }} className="hidden lg:block">
                <DemoChatAnimation />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative z-10 py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div className="text-center mb-16" initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }}>
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4 px-4 py-1.5">
                Funcionalidades
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Tudo que você precisa para
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  escalar seu atendimento
                </span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => <motion.div key={i} initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: i * 0.1
            }}>
                  <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/40 transition-all duration-500 group h-full backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/10">
                    <CardContent className="p-6 text-black border-secondary-foreground bg-primary-foreground">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 transition-colors text-primary">{feature.title}</h3>
                      <p className="text-secondary-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>)}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="relative z-10 py-24 px-6 bg-gradient-to-b from-transparent via-blue-950/30 to-transparent">
          <div className="max-w-7xl mx-auto">
            <motion.div className="text-center mb-16" initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }}>
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4 px-4 py-1.5">
                Depoimentos
              </Badge>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text bg-primary-foreground text-primary-foreground">
                O que nossos clientes dizem
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, i) => <motion.div key={i} initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: i * 0.1
            }}>
                  <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 h-full backdrop-blur-sm">
                    <CardContent className="p-6 bg-primary-foreground">
                      <div className="flex gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
                      </div>
                      <p className="mb-4 italic text-primary">"{testimonial.text}"</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                          {testimonial.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{testimonial.name}</div>
                          <div className="text-sm text-secondary-foreground">{testimonial.company}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>)}
            </div>
          </div>
        </section>

        {/* CTA Form Section */}
        <section id="form-section" className="relative z-10 py-24 px-6">
          <motion.div className="max-w-xl mx-auto" initial={{
          opacity: 0,
          y: 40
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-cyan-500/10 backdrop-blur-xl border-blue-500/30 overflow-hidden relative shadow-2xl shadow-blue-500/20">
              {/* Glow effect */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />
              
              <CardContent className="p-8 relative bg-primary-foreground">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">Garanta sua vaga no Beta</h3>
                  <p className="text-primary">Seja um dos primeiros a experimentar o futuro do atendimento</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Input placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-300/50 h-12 focus:border-blue-400 focus:ring-blue-400/20" />
                  </div>
                  <div className="space-y-2">
                    <Input type="email" placeholder="Seu melhor e-mail" value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-300/50 h-12 focus:border-blue-400 focus:ring-blue-400/20" />
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="Nome da empresa (opcional)" value={company} onChange={e => setCompany(e.target.value)} className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-300/50 h-12 focus:border-blue-400 focus:ring-blue-400/20" />
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold text-lg shadow-lg shadow-blue-500/30 border-0 bg-primary">
                    {loading ? <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processando...
                      </div> : <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Quero Participar do Beta
                        <ArrowRight className="w-5 h-5" />
                      </div>}
                  </Button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-4 text-blue-300/60 text-sm">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="bg-primary-foreground text-secondary-foreground">100% Seguro</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-secondary-foreground">Sem spam</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 py-8 px-6 border-t border-blue-500/10">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">MarketFlow</span>
              <span className="text-lg font-light text-blue-400">Chat</span>
            </div>
            <p className="text-blue-300/50 text-sm">
              © 2024 MarketFlow Chat. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>;
};
export default BetaLanding;