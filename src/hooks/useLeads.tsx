import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from './useCompanyId';

export const useLeads = () => {
  const queryClient = useQueryClient();
  const { companyId, isLoadingCompany } = useCompanyId();

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', companyId],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      // If user belongs to a company, only show that company's leads
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !isLoadingCompany,
  });

  const createLead = useMutation({
    mutationFn: async (newLead: any) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      const leadData: any = { ...newLead, user_id: userId || newLead.user_id };
      if (companyId) leadData.company_id = companyId;
      
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar lead');
    }
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar lead');
    }
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir lead');
    }
  });

  return {
    leads: leads || [],
    isLoading: isLoading || isLoadingCompany,
    createLead,
    updateLead,
    deleteLead
  };
};
