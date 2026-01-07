import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const useAgentFunctions = (agentId: string | null) => {
  const queryClient = useQueryClient();

  const { data: functions, isLoading } = useQuery({
    queryKey: ['agent-functions', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('agent_functions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgentFunction[];
    },
    enabled: !!agentId
  });

  const createFunction = useMutation({
    mutationFn: async (newFunction: Omit<AgentFunction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('agent_functions')
        .insert({
          ...newFunction,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-functions', agentId] });
      toast.success('Função criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar função');
    }
  });

  const updateFunction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AgentFunction> }) => {
      const { data, error } = await supabase
        .from('agent_functions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-functions', agentId] });
      toast.success('Função atualizada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar função');
    }
  });

  const deleteFunction = useMutation({
    mutationFn: async (functionId: string) => {
      const { error } = await supabase
        .from('agent_functions')
        .delete()
        .eq('id', functionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-functions', agentId] });
      toast.success('Função excluída!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir função');
    }
  });

  const toggleFunction = useMutation({
    mutationFn: async (functionId: string) => {
      const func = functions?.find(f => f.id === functionId);
      if (!func) throw new Error('Função não encontrada');

      const { data, error } = await supabase
        .from('agent_functions')
        .update({ is_enabled: !func.is_enabled })
        .eq('id', functionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-functions', agentId] });
      toast.success(`Função ${data.is_enabled ? 'ativada' : 'desativada'}!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar função');
    }
  });

  return {
    functions: functions || [],
    isLoading,
    createFunction,
    updateFunction,
    deleteFunction,
    toggleFunction
  };
};
