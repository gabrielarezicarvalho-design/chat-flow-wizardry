import { useState } from 'react';

// Hook simplificado - tabela agent_functions não existe no schema atual
export interface AgentFunction {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  description: string | null;
  function_type: string;
  config: Record<string, any>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const FUNCTION_TYPES = [
  { value: 'automation_ura', label: 'URA de Automação', description: 'Executar uma URA de automação' },
  { value: 'open_ai_ticket', label: 'Abrir Chamado IA', description: 'Criar chamado para acompanhamento humano' },
  { value: 'crm_query', label: 'Consultar CRM', description: 'Buscar informações de clientes no CRM' },
  { value: 'create_task', label: 'Criar Tarefa', description: 'Criar tarefas ou lembretes no sistema' },
  { value: 'http_request', label: 'Requisição HTTP', description: 'Fazer chamadas a APIs externas' },
  { value: 'send_email', label: 'Enviar Email', description: 'Enviar emails automáticos' },
  { value: 'schedule_meeting', label: 'Agendar Reunião', description: 'Criar agendamentos no calendário' },
  { value: 'asaas_invoices', label: 'Asaas - Faturas/Boletos', description: 'Buscar e enviar faturas e boletos do Asaas por CPF/CNPJ' },
  { value: 'custom', label: 'Personalizado', description: 'Função customizada com código' },
];

export interface FunctionVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

export const useAgentFunctions = (_agentId: string | null) => {
  const [functions] = useState<AgentFunction[]>([]);
  const [isLoading] = useState(false);

  const createFunction = {
    mutate: (_newFunction: Omit<AgentFunction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_newFunction: Omit<AgentFunction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      console.log('Função não implementada - tabela não existe');
      return null;
    },
    isPending: false
  };

  const updateFunction = {
    mutate: (_data: { id: string; updates: Partial<AgentFunction> }) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_data: { id: string; updates: Partial<AgentFunction> }) => {
      console.log('Função não implementada - tabela não existe');
      return null;
    },
    isPending: false
  };

  const deleteFunction = {
    mutate: (_functionId: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_functionId: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    isPending: false
  };

  const toggleFunction = {
    mutate: (_functionId: string) => {
      console.log('Função não implementada - tabela não existe');
    },
    mutateAsync: async (_functionId: string) => {
      console.log('Função não implementada - tabela não existe');
      return null;
    },
    isPending: false
  };

  return {
    functions,
    isLoading,
    createFunction,
    updateFunction,
    deleteFunction,
    toggleFunction
  };
};