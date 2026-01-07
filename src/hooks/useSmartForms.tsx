import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SmartFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'cpf' | 'address' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface SmartForm {
  id: string;
  user_id: string;
  name: string;
  department_id: string | null;
  fields: SmartFormField[];
  welcome_message: string;
  success_message: string;
  whatsapp_confirmation: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmartFormSubmission {
  id: string;
  user_id: string;
  form_id: string | null;
  connection_id: string | null;
  department_id: string | null;
  unique_token: string;
  phone: string;
  name: string | null;
  answers: Record<string, any>;
  status: string;
  notes: string | null;
  conversation_id: string | null;
  submitted_at: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useSmartForms = () => {
  const queryClient = useQueryClient();

  const { data: forms, isLoading: isLoadingForms } = useQuery({
    queryKey: ['smart_forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smart_forms' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as SmartForm[];
    }
  });

  const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['smart_form_submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smart_form_submissions' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as SmartFormSubmission[];
    }
  });

  const createForm = useMutation({
    mutationFn: async (newForm: Partial<SmartForm>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('smart_forms' as any)
        .insert([{ ...newForm, user_id: user.id }])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart_forms'] });
      toast.success('Formulário criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar formulário');
    }
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SmartForm> }) => {
      const { data, error } = await supabase
        .from('smart_forms' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart_forms'] });
      toast.success('Formulário atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar formulário');
    }
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('smart_forms' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart_forms'] });
      toast.success('Formulário excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir formulário');
    }
  });

  const updateSubmission = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SmartFormSubmission> }) => {
      const { data, error } = await supabase
        .from('smart_form_submissions' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart_form_submissions'] });
      toast.success('Registro atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar');
    }
  });

  const deleteSubmission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('smart_form_submissions' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart_form_submissions'] });
      toast.success('Registro excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir');
    }
  });

  return {
    forms: forms || [],
    submissions: submissions || [],
    isLoadingForms,
    isLoadingSubmissions,
    createForm,
    updateForm,
    deleteForm,
    updateSubmission,
    deleteSubmission
  };
};
