import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

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

interface AISettingRow {
  id: string;
  company_id: string | null;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

const normalizeSettingValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed !== 'null' ? trimmed : null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const possibleValue = record.apiKey ?? record.key ?? record.value;
    return normalizeSettingValue(possibleValue);
  }

  return null;
};

export const useAIProviderKeys = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: providerKeys = [], isLoading } = useQuery({
    queryKey: ['ai-provider-keys', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('company-ai-settings', {
        body: { action: 'list_settings' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return (data?.settings || []) as AISettingRow[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const getSettingValue = (key: string) => {
    const setting = providerKeys.find((s) => s.key === key);
    return normalizeSettingValue(setting?.value);
  };

  const getRawSetting = <T = unknown,>(key: string): T | null => {
    const setting = providerKeys.find((s) => s.key === key);
    return (setting?.value ?? null) as T | null;
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

  const saveSetting = async (key: string, value: unknown) => {
    const { data: result, error } = await supabase.functions.invoke('company-ai-settings', {
      body: { action: 'save_setting', key, value },
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
    saveModel,
    saveSetting,
  };
};
