import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIProviderKey {
  id: string;
  user_id: string;
  provider: string;
  api_key: string | null;
  is_configured: boolean;
  is_valid: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useAIProviderKeys = () => {
  const queryClient = useQueryClient();

  const getCompanyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.company_id) throw new Error('Empresa não encontrada');
    return profile.company_id;
  };

  const { data: providerKeys = [], isLoading } = useQuery({
    queryKey: ['ai-provider-keys'],
    queryFn: async () => {
      const companyId = await getCompanyId();
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', companyId)
        .in('key', ['ai_openai_key', 'ai_openai_model', 'ai_gemini_key', 'ai_gemini_model', 'ai_asaas_key']);
      
      if (error) throw error;
      return data || [];
    }
  });

  const getSettingValue = (key: string) => {
    const setting = providerKeys.find((s: any) => s.key === key);
    return setting?.value as string | null;
  };

  const upsertKeyMutation = useMutation({
    mutationFn: async (data: { provider: string; apiKey: string }) => {
      const { data: result, error } = await supabase.functions.invoke('company-ai-settings', {
        body: {
          action: 'upsert_key',
          provider: data.provider,
          apiKey: data.apiKey,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      toast.success('Chave salva com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ai-provider-keys'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar chave');
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (provider: string) => {
      const { data: result, error } = await supabase.functions.invoke('company-ai-settings', {
        body: {
          action: 'delete_key',
          provider,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      toast.success('Chave removida!');
      queryClient.invalidateQueries({ queryKey: ['ai-provider-keys'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover chave');
    },
  });

  const getKeyStatus = (provider: string) => {
    const keyName = provider === 'openai' ? 'ai_openai_key' 
      : provider === 'google' ? 'ai_gemini_key' 
      : 'ai_asaas_key';
    const value = getSettingValue(keyName);
    return {
      isConfigured: !!value,
      isValid: !!value,
      lastValidated: null as string | null
    };
  };

  const isProviderAvailable = (provider: string) => {
    return getKeyStatus(provider).isConfigured;
  };

  const saveModel = async (provider: string, model: string) => {
    const { data: result, error } = await supabase.functions.invoke('company-ai-settings', {
      body: {
        action: 'save_model',
        provider,
        model,
      },
    });

    if (error) throw error;
    if (result?.error) throw new Error(result.error);

    queryClient.invalidateQueries({ queryKey: ['ai-provider-keys'] });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  };

  return {
    providerKeys,
    isLoading,
    upsertKey: upsertKeyMutation,
    deleteKey: deleteKeyMutation,
    getKeyStatus,
    isProviderAvailable,
    getSettingValue,
    saveModel
  };
};
