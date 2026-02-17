import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, Send, CheckCircle, Users, BarChart3, Bot, Target, TrendingUp, Zap, ArrowLeft, Shield, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

interface PartnerConfig {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
}

// Color utilities
const hexToHSL = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const lightenHex = (hex: string, amount: number) => {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Sub-components
const PreviewBanner = ({ partner, navigate }: { partner: PartnerConfig; navigate: (path: string) => void }) => (
  <motion.div
    initial={{ y: -40, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 py-2.5 px-4 text-sm font-medium backdrop-blur-md border-b"
    style={{
      background: hexToRgba(partner.primary_color, 0.15),
      borderColor: hexToRgba(partner.primary_color, 0.2),
      color: '#fff',
    }}
  >
    <Eye className="w-4 h-4" style={{ color: partner.primary_color }} />
    <span>Preview — <strong>{partner.name}</strong></span>
    <button
      onClick={() => navigate('/admin')}
      className="ml-2 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
      style={{ background: hexToRgba(partner.primary_color, 0.2), color: partner.primary_color }}
    >
      <ArrowLeft className="w-3 h-3" />
      Admin
    </button>
  </motion.div>
);

const StatsCard = ({ stat, index, pc, bgSoft }: { stat: any; index: number; pc: string; bgSoft: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 + index * 0.1 }}
    whileHover={{ y: -4, scale: 1.02 }}
    className="group relative rounded-2xl p-5 border transition-all duration-300 cursor-default overflow-hidden"
    style={{ background: bgSoft, borderColor: hexToRgba(pc, 0.1) }}
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: `radial-gradient(circle at 50% 50%, ${hexToRgba(pc, 0.08)}, transparent 70%)` }} />
    <div className="relative z-10">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `linear-gradient(135deg, ${pc}, ${lightenHex(pc, 30)})`, boxShadow: `0 4px 14px ${hexToRgba(pc, 0.3)}` }}>
        <stat.icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
      <p className="text-xs mt-1" style={{ color: hexToRgba('#ffffff', 0.45) }}>{stat.label}</p>
    </div>
  </motion.div>
);

const FeatureRow = ({ feat, index, pc, bgSoft }: { feat: any; index: number; pc: string; bgSoft: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.6 + index * 0.1 }}
    whileHover={{ x: 6 }}
    className="flex items-center gap-4 rounded-xl px-5 py-4 border transition-all duration-300 group cursor-default"
    style={{ background: bgSoft, borderColor: hexToRgba(pc, 0.06) }}
  >
    <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
      style={{ background: hexToRgba(pc, 0.15) }}>
      <feat.icon className="h-5 w-5" style={{ color: pc }} />
    </div>
    <div>
      <p className="text-white font-medium text-sm">{feat.text}</p>
      <p className="text-xs mt-0.5" style={{ color: hexToRgba('#ffffff', 0.4) }}>{feat.description}</p>
    </div>
  </motion.div>
);

const LoginForm = ({ partner, pc, bgSoft, onLogin }: {
  partner: PartnerConfig; pc: string; bgSoft: string;
  onLogin: (username: string, password: string) => Promise<void>;
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Preencha usuário e senha');
      return;
    }
    setLoading(true);
    try {
      await onLogin(username.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="rounded-3xl p-8 border relative overflow-hidden"
      style={{ background: bgSoft, borderColor: hexToRgba(pc, 0.1), backdropFilter: 'blur(20px)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
        style={{ background: `linear-gradient(90deg, ${pc}, ${lightenHex(pc, 40)}, ${pc})` }} />

      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: hexToRgba(pc, 0.15) }}
        >
          <Shield className="w-7 h-7" style={{ color: pc }} />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-1">Bem-vindo!</h2>
        <p className="text-sm" style={{ color: hexToRgba('#ffffff', 0.45) }}>Acesse sua conta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide uppercase" style={{ color: hexToRgba('#ffffff', 0.5) }}>Usuário</Label>
          <Input
            type="text"
            placeholder="Digite seu usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-12 text-sm text-white placeholder:opacity-40 rounded-xl border-0 focus-visible:ring-1"
            style={{ background: hexToRgba('#ffffff', 0.05), boxShadow: `inset 0 0 0 1px ${hexToRgba('#ffffff', 0.08)}` }}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide uppercase" style={{ color: hexToRgba('#ffffff', 0.5) }}>Senha</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-sm pr-12 text-white placeholder:opacity-40 rounded-xl border-0 focus-visible:ring-1"
              style={{ background: hexToRgba('#ffffff', 0.05), boxShadow: `inset 0 0 0 1px ${hexToRgba('#ffffff', 0.08)}` }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-white/30 hover:text-white/60"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-sm font-semibold text-white rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${pc}, ${lightenHex(pc, 20)})`,
            boxShadow: `0 8px 24px ${hexToRgba(pc, 0.35)}`,
          }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-xs mt-6" style={{ color: hexToRgba('#ffffff', 0.25) }}>
        Powered by {partner.name}
      </p>
    </motion.div>
  );
};

// Main component
const WhiteLabelPreview = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setPartnerBranding } = useTheme();
  const [partner, setPartner] = useState<PartnerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPartner = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }
      const { data, error } = await (supabase
        .from('white_label_partners' as any)
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, background_color')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle() as any);
      if (error || !data) { setNotFound(true); } else { setPartner(data); }
      setLoading(false);
    };
    fetchPartner();
  }, [slug]);

  const handleLogin = async (username: string, password: string) => {
    const email = `${username}@internal.marketflow.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('Usuário ou senha incorretos');
      console.error('Login error:', error);
      return;
    }

    // Save partner branding so the entire system uses these colors
    if (partner) {
      setPartnerBranding({
        name: partner.name,
        slug: partner.slug,
        logo_url: partner.logo_url,
        primary_color: partner.primary_color,
        secondary_color: partner.secondary_color,
        accent_color: partner.accent_color,
        background_color: partner.background_color,
      });
    }

    toast.success(`Bem-vindo, ${data.user?.user_metadata?.full_name || username}!`);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (notFound || !partner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Parceiro não encontrado</h1>
          <p className="text-white/40 mb-4">O slug "{slug}" não corresponde a nenhum parceiro ativo.</p>
          <Button onClick={() => navigate('/admin')}>Voltar ao Admin</Button>
        </div>
      </div>
    );
  }

  const pc = partner.primary_color;
  const hsl = hexToHSL(pc);
  const bgBase = `hsl(${hsl.h}, ${Math.min(hsl.s, 25)}%, 8%)`;
  const bgSoft = hexToRgba(pc, 0.06);

  const statsCards = [
    { icon: Send, label: 'Mensagens Enviadas', value: '125.4K' },
    { icon: CheckCircle, label: 'Taxa de Entrega', value: '98.7%' },
    { icon: Users, label: 'Contatos Alcançados', value: '34.5K' },
    { icon: BarChart3, label: 'Campanhas Realizadas', value: '847' },
  ];

  const features = [
    { icon: Bot, text: 'IA Avançada para Atendimento', description: 'Agentes inteligentes 24/7' },
    { icon: Target, text: 'Disparos Segmentados', description: 'Alcance o público certo' },
    { icon: TrendingUp, text: 'Análises em Tempo Real', description: 'Métricas detalhadas' },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden relative" style={{ background: bgBase }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 80% 60% at 20% 40%, ${hexToRgba(pc, 0.07)}, transparent 70%),
          radial-gradient(ellipse 60% 50% at 80% 60%, ${hexToRgba(pc, 0.04)}, transparent 70%)`,
      }} />

      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(${hexToRgba(pc, 0.3)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba(pc, 0.3)} 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }} />

      <PreviewBanner partner={partner} navigate={navigate} />

      {/* Left Side */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-3/5 relative"
      >
        <div className="relative z-10 flex flex-col justify-center w-full p-12 xl:p-16 mt-12">
          <div className="flex items-center gap-5 mb-10">
            {partner.logo_url ? (
              <motion.img src={partner.logo_url} alt={partner.name}
                className="w-16 h-16 object-contain rounded-2xl"
                style={{ boxShadow: `0 8px 32px ${hexToRgba(pc, 0.2)}` }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
            ) : (
              <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${pc}, ${lightenHex(pc, 30)})`, boxShadow: `0 8px 32px ${hexToRgba(pc, 0.3)}` }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                {partner.name.charAt(0)}
              </motion.div>
            )}
            <div>
              <h1 className="text-3xl xl:text-4xl font-bold text-white tracking-tight">{partner.name}</h1>
              <p className="text-sm mt-1" style={{ color: hexToRgba('#ffffff', 0.4) }}>Plataforma de IA & Disparos em Massa</p>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2" style={{ color: hexToRgba('#ffffff', 0.5) }}>
              <Zap className="w-4 h-4" style={{ color: pc }} /> Estatísticas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map((stat, i) => <StatsCard key={i} stat={stat} index={i} pc={pc} bgSoft={bgSoft} />)}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: hexToRgba('#ffffff', 0.5) }}>Recursos Principais</h2>
            <div className="space-y-2.5">
              {features.map((feat, i) => <FeatureRow key={i} feat={feat} index={i} pc={pc} bgSoft={bgSoft} />)}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 lg:p-10 relative mt-12">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${hexToRgba(pc, 0.06)}, transparent 70%)` }} />

        <div className="w-full max-w-sm relative z-10">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="lg:hidden text-center mb-8">
            {partner.logo_url ? (
              <img src={partner.logo_url} alt={partner.name} className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4"
                style={{ background: `linear-gradient(135deg, ${pc}, ${lightenHex(pc, 30)})` }}>
                {partner.name.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-bold text-white">{partner.name}</h1>
            <p className="text-sm mt-1" style={{ color: hexToRgba('#ffffff', 0.4) }}>IA & Disparos em Massa</p>
          </motion.div>

          <LoginForm partner={partner} pc={pc} bgSoft={bgSoft} onLogin={handleLogin} />
        </div>
      </div>
    </div>
  );
};

export default WhiteLabelPreview;
