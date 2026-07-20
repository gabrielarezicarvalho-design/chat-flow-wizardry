import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const useSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle();

      let query = supabase.from('settings').select('*');
      if (profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      } else {
        // Admin sem empresa: usa configurações globais (company_id null)
        query = query.is('company_id', null);
      }

      const { data, error } = await query;
      if (error && error.code !== 'PGRST116') throw error;

      const settingsObj: Record<string, any> = {};
      data?.forEach(item => {
        settingsObj[item.key] = item.value;
      });
      return settingsObj;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      const companyId = profile?.company_id ?? null;

      for (const [key, value] of Object.entries(updates)) {
        if (companyId) {
          const { error } = await supabase
            .from('settings')
            .upsert({ company_id: companyId, key, value }, { onConflict: 'company_id,key' });
          if (error) throw error;
        } else {
          // Global (admin sem empresa): null não faz match em unique, então manual
          const { data: existing } = await supabase
            .from('settings')
            .select('id')
            .is('company_id', null)
            .eq('key', key)
            .maybeSingle();

          if (existing?.id) {
            const { error } = await supabase
              .from('settings')
              .update({ value })
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('settings')
              .insert({ company_id: null, key, value });
            if (error) throw error;
          }
        }
      }

      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar configurações');
    }
  });

  return {
    settings,
    isLoading,
    updateSettings
  };
};