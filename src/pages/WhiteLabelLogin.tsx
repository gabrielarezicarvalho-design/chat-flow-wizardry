import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const WhiteLabelLogin = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('Preencha usuário e senha');
      return;
    }

    setLoading(true);
    try {
      // Buscar parceiro pelo username (slug)
      const { data: partner, error: partnerError } = await (supabase
        .from('white_label_partners' as any)
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, background_color, supabase_url, supabase_anon_key, partner_password')
        .eq('slug', username.trim().toLowerCase())
        .eq('is_active', true)
        .maybeSingle() as any);

      if (partnerError) throw partnerError;
      
      if (!partner) {
        toast.error('Parceiro não encontrado');
        setLoading(false);
        return;
      }

      // Verificar senha
      if (partner.partner_password !== password) {
        toast.error('Senha incorreta');
        setLoading(false);
        return;
      }

      // Salvar acesso no sessionStorage
      sessionStorage.setItem('white_label_config_access', 'true');
      localStorage.setItem('white_label_partner', JSON.stringify({
        id: partner.id,
        slug: partner.slug,
        name: partner.name,
        logo_url: partner.logo_url,
        primary_color: partner.primary_color,
        secondary_color: partner.secondary_color,
        accent_color: partner.accent_color,
        background_color: partner.background_color,
        supabase_url: partner.supabase_url,
        supabase_anon_key: partner.supabase_anon_key,
        partner_password: password,
      }));

      toast.success('Login realizado com sucesso!');
      navigate('/white-label-config');
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Acesso White Label</h1>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais de parceiro
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Usuário
              </label>
              <Input
                type="text"
                placeholder="seu-identificador"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Voltar para login principal
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by MarketFlow
        </p>
      </motion.div>
    </div>
  );
};

export default WhiteLabelLogin;