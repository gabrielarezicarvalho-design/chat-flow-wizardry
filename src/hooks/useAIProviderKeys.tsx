import { useState } from 'react';

// Hook simplificado - tabela ai_provider_keys não existe no schema atual
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
  const [providerKeys] = useState<AIProviderKey[]>([]);
  const [isLoading] = useState(false);

  const upsertKey = {
    mutate: (_data: { provider: string; apiKey: string }) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_data: { provider: string; apiKey: string }) => {
      console.log('Função não implementada - tabela não existe');
      return { data: null, isValid: false };
    },
    isPending: false
  };

  const deleteKey = {
    mutate: (_provider: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_provider: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    isPending: false
  };

  const getKeyStatus = (_provider: string) => ({
    isConfigured: false,
    isValid: false,
    lastValidated: null as string | null
  });

  const isProviderAvailable = (provider: string) => {
    // Lovable AI is always available
    return provider === 'lovable';
  };

  return {
    providerKeys,
    isLoading,
    upsertKey,
    deleteKey,
    getKeyStatus,
    isProviderAvailable
  };
};