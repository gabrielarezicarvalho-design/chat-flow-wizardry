import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useCompanyId = () => {
  const { user } = useAuth();

  const { data: companyId, isLoading } = useQuery({
    queryKey: ['user-company-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.company_id || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return { companyId: companyId ?? null, isLoadingCompany: isLoading };
};
