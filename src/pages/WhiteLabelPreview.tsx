import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, Send, CheckCircle, Users, BarChart3, Bot, Target, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

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

const WhiteLabelPreview = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchPartner = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await (supabase
        .from('white_label_partners' as any)
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, background_color')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle() as any);

      if (error || !data) {
        setNotFound(true);
      } else {
        setPartner(data);
      }
      setLoading(false);
    };
    fetchPartner();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Parceiro não encontrado</h1>
          <p className="text-slate-400 mb-4">O slug "{slug}" não corresponde a nenhum parceiro ativo.</p>
          <Button onClick={() => navigate('/admin')}>Voltar ao Admin</Button>
        </div>
      </div>
    );
  }

  const pc = partner.primary_color;
  const bc = partner.background_color;
  const sc = partner.secondary_color;
  const ac = partner.accent_color;

  // Helper to lighten/darken hex
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const statsCards = [
    { icon: Send, label: 'Mensagens Enviadas', value: '125.4K', delay: 0.2 },
    { icon: CheckCircle, label: 'Taxa de Entrega', value: '98.7%', delay: 0.3 },
    { icon: Users, label: 'Contatos Alcançados', value: '34.5K', delay: 0.4 },
    { icon: BarChart3, label: 'Campanhas Realizadas', value: '847', delay: 0.5 },
  ];

  const features = [
    { icon: Bot, text: 'IA Avançada para Atendimento', description: 'Agentes inteligentes 24/7' },
    { icon: Target, text: 'Disparos Segmentados', description: 'Alcance o público certo' },
    { icon: TrendingUp, text: 'Análises em Tempo Real', description: 'Métricas detalhadas' },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: bc }}>
      {/* Preview banner */}
      <div className="fixed top-0 left-0 right-0 z-50 text-center py-2 text-sm font-medium text-white" style={{ background: ac }}>
        👁️ Modo Preview — {partner.name} ({partner.slug})
        <button onClick={() => navigate('/admin')} className="ml-4 underline text-white/80 hover:text-white">
          Voltar ao Admin
        </button>
      </div>

      {/* Left Side */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-3/5 relative overflow-hidden"
      >
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, ${bc} 0%, ${hexToRgba(pc, 0.2)} 100%)`
        }}>
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse at top right, ${hexToRgba(pc, 0.2)}, transparent 70%)`
          }} />
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse at bottom left, ${hexToRgba(sc, 0.1)}, transparent 70%)`
          }} />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-[100px]"
          style={{ background: hexToRgba(pc, 0.2) }}
        />

        <div className="relative z-10 flex flex-col justify-center w-full p-12 xl:p-16 mt-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            {partner.logo_url ? (
              <motion.img
                src={partner.logo_url}
                alt={partner.name}
                className="w-20 h-20 object-contain rounded-2xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            ) : (
              <motion.div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: pc }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {partner.name.charAt(0)}
              </motion.div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">{partner.name}</h1>
              <p className="text-lg" style={{ color: hexToRgba('#ffffff', 0.6) }}>Plataforma de IA & Disparos em Massa</p>
            </div>
          </div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
            <h2 className="text-xl font-semibold text-white/90 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: pc }} />
              Estatísticas da Plataforma
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {statsCards.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: stat.delay }} whileHover={{ scale: 1.03, y: -2 }}>
                  <div className="relative border rounded-2xl p-5 transition-all duration-300" style={{
                    background: hexToRgba(bc, 0.5),
                    borderColor: hexToRgba('#ffffff', 0.1),
                    backdropFilter: 'blur(12px)',
                  }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-lg" style={{ background: pc }}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm" style={{ color: hexToRgba('#ffffff', 0.5) }}>{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <h2 className="text-xl font-semibold text-white/90 mb-4">Recursos Principais</h2>
            <div className="space-y-3">
              {features.map((feat, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.1 }} whileHover={{ x: 5 }}
                  className="flex items-center gap-4 rounded-xl px-5 py-4 border transition-all duration-300"
                  style={{
                    background: hexToRgba(bc, 0.3),
                    borderColor: hexToRgba('#ffffff', 0.05),
                  }}
                >
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: hexToRgba(pc, 0.2) }}>
                    <feat.icon className="h-6 w-6" style={{ color: pc }} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{feat.text}</p>
                    <p className="text-sm" style={{ color: hexToRgba('#ffffff', 0.5) }}>{feat.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 relative mt-10" style={{
        background: `linear-gradient(180deg, ${bc} 0%, ${hexToRgba(bc, 0.95)} 100%)`
      }}>
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Header */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="lg:hidden text-center mb-8">
            {partner.logo_url ? (
              <img src={partner.logo_url} alt={partner.name} className="w-24 h-24 object-contain mx-auto mb-4 rounded-2xl" />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4" style={{ background: pc }}>
                {partner.name.charAt(0)}
              </div>
            )}
            <h1 className="text-3xl font-bold text-white">{partner.name}</h1>
            <p style={{ color: hexToRgba('#ffffff', 0.5) }} className="mt-1">IA & Disparos em Massa</p>
          </motion.div>

          {/* Login Card */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="rounded-2xl p-8 border"
            style={{
              background: hexToRgba(bc, 0.5),
              borderColor: hexToRgba('#ffffff', 0.1),
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta!</h2>
              <p style={{ color: hexToRgba('#ffffff', 0.5) }}>Acesse sua conta para continuar</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: hexToRgba('#ffffff', 0.7) }}>Usuário</Label>
                <Input
                  type="text"
                  placeholder="Digite seu usuário"
                  className="h-12 text-base text-white placeholder:opacity-50"
                  style={{
                    background: hexToRgba(bc, 0.5),
                    borderColor: hexToRgba('#ffffff', 0.15),
                  }}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: hexToRgba('#ffffff', 0.7) }}>Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-12 text-base pr-12 text-white placeholder:opacity-50"
                    style={{
                      background: hexToRgba(bc, 0.5),
                      borderColor: hexToRgba('#ffffff', 0.15),
                    }}
                    disabled
                  />
                  <Button type="button" variant="ghost" size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-white/40 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button className="w-full h-12 text-base font-semibold shadow-lg text-white" style={{ background: pc }} disabled>
                Entrar
              </Button>
            </div>

            <p className="text-center text-sm mt-6" style={{ color: hexToRgba('#ffffff', 0.3) }}>
              Este é apenas um preview. Para login real, acesse o sistema pelo domínio configurado.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default WhiteLabelPreview;
