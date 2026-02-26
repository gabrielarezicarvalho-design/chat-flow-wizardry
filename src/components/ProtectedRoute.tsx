import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getSubdomainSlug, resolveCompanyBySlug, validateUserCompany } from '@/lib/subdomain';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [subdomainChecked, setSubdomainChecked] = useState(false);
  const [subdomainValid, setSubdomainValid] = useState(true);

  useEffect(() => {
    const checkSubdomain = async () => {
      if (!user) {
        setSubdomainChecked(true);
        return;
      }

      const slug = getSubdomainSlug();
      if (!slug) {
        // Not in subdomain environment, skip
        setSubdomainChecked(true);
        return;
      }

      const company = await resolveCompanyBySlug(slug);
      if (!company) {
        toast.error('Empresa não encontrada. Verifique o endereço.');
        setSubdomainValid(false);
        await supabase.auth.signOut();
        setSubdomainChecked(true);
        return;
      }

      const isValid = await validateUserCompany(user.id, company.id);
      if (!isValid) {
        toast.error('Você não tem acesso a esta empresa.');
        setSubdomainValid(false);
        await supabase.auth.signOut();
      }

      setSubdomainChecked(true);
    };

    if (!loading) {
      checkSubdomain();
    }
  }, [user, loading]);

  if (loading || !subdomainChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !subdomainValid) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
