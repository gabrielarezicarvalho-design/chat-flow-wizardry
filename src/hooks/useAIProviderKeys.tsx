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

  const { data: providerKeys, isLoading } = useQuery({
    queryKey: ['ai-provider-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_provider_keys')
        .select('*')
        .order('provider');
      
      if (error) throw error;
      return data as AIProviderKey[];
    }
  });

  const upsertKey = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: string; apiKey: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // First, validate the key
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-ai-key', {
        body: { provider, apiKey }
      });

      if (validationError) throw validationError;

      const isValid = validationResult?.valid === true;

      const { data, error } = await supabase
        .from('ai_provider_keys')
        .upsert({
          user_id: user.id,
          provider,
          api_key: apiKey,
          is_configured: true,
          is_valid: isValid,
          last_validated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider'
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, isValid };
    },
    onSuccess: ({ isValid }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-keys'] });
      if (isValid) {
        toast.success('Chave de IA salva e validada com sucesso!');
      } else {
        toast.warning('Chave salva, mas a validação falhou. Verifique se está correta.');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar chave de IA');
    }
  });

  const deleteKey = useMutation({
    mutationFn: async (provider: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('ai_provider_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-keys'] });
      toast.success('Chave de IA removida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover chave de IA');
    }
  });

  const getKeyStatus = (provider: string) => {
    const key = providerKeys?.find(k => k.provider === provider);
    return {
      isConfigured: key?.is_configured || false,
      isValid: key?.is_valid || false,
      lastValidated: key?.last_validated_at
    };
  };

  const isProviderAvailable = (provider: string) => {
    // Lovable AI is always available
    if (provider === 'lovable') return true;
    
    const key = providerKeys?.find(k => k.provider === provider);
    return key?.is_configured && key?.is_valid;
  };

  return {
    providerKeys: providerKeys || [],
    isLoading,
    upsertKey,
    deleteKey,
    getKeyStatus,
    isProviderAvailable
  };
};
