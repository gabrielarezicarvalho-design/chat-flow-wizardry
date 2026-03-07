import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Send, Users, CheckCircle, Zap, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import robotImage from '@/assets/marketflow-robot.png';

interface CampaignStats {
  totalCampaigns: number;
  totalMessagesSent: number;
  deliveryRate: number;
  totalContacts: number;
}

const Auth = () => {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    totalMessagesSent: 0,
    deliveryRate: 0,
    totalContacts: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: campaigns } = await supabase.
        from('campaigns').
        select('sent_count, failed_count, total_contacts');

        if (campaigns && campaigns.length > 0) {
          const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
          const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
          const totalContacts = campaigns.reduce((acc, c) => acc + (c.total_contacts || 0), 0);
          const deliveryRate = totalSent > 0 ? totalSent / (totalSent + totalFailed) * 100 : 98.5;

          setStats({
            totalCampaigns: campaigns.length,
            totalMessagesSent: totalSent || 12847,
            deliveryRate: deliveryRate || 98.5,
            totalContacts: totalContacts || 5420
          });
        } else {
          // Default showcase stats
          setStats({
            totalCampaigns: 847,
            totalMessagesSent: 125400,
            deliveryRate: 98.7,
            totalContacts: 34500
          });
        }
      } catch (error) {
        // Use showcase stats on error
        setStats({
          totalCampaigns: 847,
          totalMessagesSent: 125400,
          deliveryRate: 98.7,
          totalContacts: 34500
        });
      }
    };

    fetchStats();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(username, password);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const statsCards = [
  {
    icon: Send,
    label: 'Mensagens Enviadas',
    value: formatNumber(stats.totalMessagesSent),
    color: 'from-blue-500 to-cyan-500',
    delay: 0.2
  },
  {
    icon: CheckCircle,
    label: 'Taxa de Entrega',
    value: `${stats.deliveryRate.toFixed(1)}%`,
    color: 'from-emerald-500 to-green-500',
    delay: 0.3
  },
  {
    icon: Users,
    label: 'Contatos Alcançados',
    value: formatNumber(stats.totalContacts),
    color: 'from-purple-500 to-pink-500',
    delay: 0.4
  },
  {
    icon: BarChart3,
    label: 'Campanhas Realizadas',
    value: formatNumber(stats.totalCampaigns),
    color: 'from-orange-500 to-amber-500',
    delay: 0.5
  }];



  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      {/* Left Side - Stats & Features */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
        
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-[#0c522e]/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0c522e]/25 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#0c522e]/15 via-transparent to-transparent" />
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Animated Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#0c522e]/25 rounded-full blur-[100px]" />
        
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#0c522e]/20 rounded-full blur-[80px]" />
        

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center w-full h-full p-8 xl:p-12">
          {/* Header with Robot */}
          <div className="flex items-center gap-3 mb-6">
            <motion.img
              src={robotImage}
              alt="MarketFlow"
              className="w-16 h-16 object-contain"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
            
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Invaiper </h1>
              <p className="text-slate-400">Plataforma de IA & Disparos em Massa</p>
            </div>
          </div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6">
            
            <h2 className="text-lg font-semibold text-white/90 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#0c522e]" />
              Estatísticas da Plataforma
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map((stat, index) =>
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: stat.delay }}
                whileHover={{ scale: 1.03, y: -2 }}
                className="relative group">
                
                  <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all duration-300">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center mb-2 shadow-lg`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-white mb-0.5">{stat.value}</p>
                    <p className="text-slate-400 text-xs">{stat.label}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center bg-slate-900 p-8 relative">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
        
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md relative z-10">
          
          {/* Mobile Header */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:hidden text-center mb-8">
            
            <div className="flex justify-center mb-4">
              <motion.img
                src={robotImage}
                alt="MarketFlow"
                className="w-24 h-24 object-contain"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
              
            </div>
            <h1 className="text-3xl font-bold text-white">MarketFlow</h1>
            <p className="text-slate-400 mt-1">IA & Disparos em Massa</p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta!</h2>
              <p className="text-slate-400">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-300">
                  Usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-12 text-base bg-slate-900/50 border-slate-700 focus:border-[#0c522e] text-white placeholder:text-slate-500 transition-all duration-300" />
                
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 text-base pr-12 bg-slate-900/50 border-slate-700 focus:border-primary text-white placeholder:text-slate-500 transition-all duration-300" />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}>
                    
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}>
                
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25"
                  disabled={loading}>
                  
                  {loading ?
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> :


                  'Entrar'
                  }
                </Button>
              </motion.div>
            </form>

            <div className="text-center text-sm text-slate-500 mt-6 space-y-1">
              <p>Problemas para acessar? Entre em contato:</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <a href="mailto:contato@marketflowchat.com.br" className="text-primary hover:underline transition-colors">
                  contato@marketflowchat.com.br
                </a>
                <span className="text-slate-600">•</span>
                <a href="https://wa.me/5551992226536" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors">
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4 text-xs text-slate-500">
              <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacidade</a>
              <span>•</span>
              <a href="/termos-de-servico" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Termos</a>
              <span>•</span>
              <a href="/exclusao-de-dados" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Exclusão de Dados</a>
            </div>
          </motion.div>

          {/* Mobile Stats Preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="lg:hidden mt-6 grid grid-cols-2 gap-3">
            
            {statsCards.slice(0, 2).map((stat, index) =>
            <div key={index} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-center">
                <stat.icon className={`w-5 h-5 mx-auto mb-2 text-primary`} />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-xs">{stat.label}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>);

};

export default Auth;