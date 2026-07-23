import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSubdomainSlug, resolveCompanyBySlug, validateUserCompany } from '@/lib/subdomain';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update online status when user logs in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            supabase
              .from('profiles')
              .update({ is_online: true, last_seen_at: new Date().toISOString() })
              .eq('id', session.user.id)
              .then();
          }, 0);
        }
        
        // Update offline status when user logs out
        if (event === 'SIGNED_OUT') {
          // Can't update profile after sign out
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (usernameOrEmail: string, password: string) => {
    try {
      let email = usernameOrEmail;
      
      // If it doesn't look like an email, try to find the user by username
      if (!usernameOrEmail.includes('@')) {
        // First try with internal.marketflow.local domain
        const internalEmail = `${usernameOrEmail}@internal.marketflow.local`;
        
        const { error: internalError } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        });

        if (!internalError) {
          // Validate subdomain before completing login
          const subdomainValid = await validateSubdomainAccess();
          if (!subdomainValid) return;
          
          toast.success('Login realizado com sucesso!');
          navigate('/home');
          return;
        }

        // If that fails, try looking up the email by username in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', usernameOrEmail)
          .single();

        if (profile) {
          const patterns = [
            `${usernameOrEmail}@marketflow.com.br`,
            `${usernameOrEmail}@internal.marketflow.local`,
          ];
          
          for (const testEmail of patterns) {
            const { error: patternError } = await supabase.auth.signInWithPassword({
              email: testEmail,
              password,
            });
            
            if (!patternError) {
              const subdomainValid = await validateSubdomainAccess();
              if (!subdomainValid) return;
              
              toast.success('Login realizado com sucesso!');
              navigate('/home');
              return;
            }
          }
        }

        throw new Error('Credenciais inválidas');
      }

      // If it's already an email, use it directly
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Validate subdomain before completing login
      const subdomainValid = await validateSubdomainAccess();
      if (!subdomainValid) return;

      toast.success('Login realizado com sucesso!');
      navigate('/home');
    } catch (error: any) {
      toast.error('Credenciais inválidas');
      throw error;
    }
  };

  /**
   * Validates that the currently authenticated user belongs to the company
   * associated with the current subdomain. If not, signs out and shows error.
   */
  const validateSubdomainAccess = async (): Promise<boolean> => {
    const slug = getSubdomainSlug();
    if (!slug) return true; // Not in subdomain environment, skip validation

    const company = await resolveCompanyBySlug(slug);
    if (!company) {
      await supabase.auth.signOut();
      toast.error('Empresa não encontrada. Verifique o endereço.');
      return false;
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user) return false;

    const isValid = await validateUserCompany(currentSession.user.id, company.id);
    if (!isValid) {
      await supabase.auth.signOut();
      toast.error('Você não tem acesso a esta empresa. Verifique seu endereço.');
      return false;
    }

    return true;
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/home`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            company_name: companyName,
          }
        }
      });

      if (error) throw error;

      toast.success('Conta criada com sucesso! Verifique seu email.');
      navigate('/home');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Update offline status before signing out
      if (user) {
        // Use setTimeout to avoid blocking
        supabase
          .from('profiles')
          .update({ is_online: false, last_seen_at: new Date().toISOString() })
          .eq('id', user.id)
          .then();
      }

      // Clear partner branding on logout
      localStorage.removeItem('partner_branding');

      // Navigate first to avoid queries running after logout
      navigate('/auth');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Reset CSS variables
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-dark');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--gradient-primary');

      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      // Ignore "Auth session missing" errors during logout - this is expected
      if (error.message?.includes('Auth session missing')) {
        toast.success('Logout realizado com sucesso!');
        return;
      }
      toast.error(error.message || 'Erro ao fazer logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
