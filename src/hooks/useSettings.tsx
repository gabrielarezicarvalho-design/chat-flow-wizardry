import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar company_id do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', profile.company_id);
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Converter array de configurações para objeto
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

      // Buscar company_id do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      // Upsert cada configuração
      for (const [key, value] of Object.entries(updates)) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            company_id: profile.company_id,
            key,
            value
          }, {
            onConflict: 'company_id,key'
          });
        
        if (error) throw error;
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