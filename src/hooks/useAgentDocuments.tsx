import { useState } from 'react';

// Hook simplificado - tabela agent_documents não existe no schema atual
export interface AgentDocument {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  content_text: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useAgentDocuments = (_agentId: string | null) => {
  const [documents] = useState<AgentDocument[]>([]);
  const [isLoading] = useState(false);

  const uploadDocument = {
    mutate: (_data: { file: File; agentId: string }) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_data: { file: File; agentId: string }) => {
      console.log('Função não implementada - tabela não existe');
      return null;
    },
    isPending: false
  };

  const deleteDocument = {
    mutate: (_documentId: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_documentId: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    isPending: false
  };

  return {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument
  };
};