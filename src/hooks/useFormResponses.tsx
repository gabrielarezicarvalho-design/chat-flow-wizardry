import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FormResponse {
  id: string;
  user_id: string;
  conversation_id: string | null;
  flow_id: string | null;
  phone: string;
  name: string | null;
  collected_data: Record<string, any>;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useFormResponses = () => {
  const queryClient = useQueryClient();

  const { data: formResponses, isLoading } = useQuery({
    queryKey: ['form_responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_responses' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as FormResponse[];
    }
  });

  const updateFormResponse = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FormResponse> }) => {
      const { data, error } = await supabase
        .from('form_responses' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_responses'] });
      toast.success('Registro atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar');
    }
  });

  const deleteFormResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_responses' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_responses'] });
      toast.success('Registro excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir');
    }
  });

  return {
    formResponses: formResponses || [],
    isLoading,
    updateFormResponse,
    deleteFormResponse
  };
};
