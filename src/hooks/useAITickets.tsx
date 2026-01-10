import { useState } from 'react';

// Hook simplificado - tabela ai_tickets não existe no schema atual
export interface AITicket {
  id: string;
  user_id: string;
  conversation_id?: string;
  connection_id?: string;
  agent_id?: string;
  contact_name?: string;
  contact_phone: string;
  reason: string;
  dissatisfaction_level: string;
  best_contact_time?: string;
  ai_summary?: string;
  status: string;
  priority: string;
  notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export const useAITickets = () => {
  const [tickets] = useState<AITicket[]>([]);
  const [isLoading] = useState(false);

  const createTicket = {
    mutate: (_data: Partial<AITicket>) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_data: Partial<AITicket>) => {
      console.log('Função não implementada - tabela não existe');
      return null;
    },
    isPending: false
  };

  const updateTicket = {
    mutate: (_data: { id: string; updates: Partial<AITicket> }) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_data: { id: string; updates: Partial<AITicket> }) => {
      console.log('Função não implementada - tabela não existe');
      return null;
    },
    isPending: false
  };

  const resolveTicket = {
    mutate: (_data: { id: string; notes?: string }) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_data: { id: string; notes?: string }) => {
      console.log('Função não implementada - tabela não existe');
      return null;
    },
    isPending: false
  };

  const deleteTicket = {
    mutate: (_id: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_id: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    isPending: false
  };

  return {
    tickets,
    isLoading,
    createTicket,
    updateTicket,
    resolveTicket,
    deleteTicket
  };
};