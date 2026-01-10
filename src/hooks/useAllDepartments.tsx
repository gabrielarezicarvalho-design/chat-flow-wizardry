import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook para buscar TODOS os departamentos (para uso em flows)
export const useAllDepartments = () => {
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['all-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, color, description')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  return { departments, isLoading };
};
