import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook para buscar TODOS os departamentos (para uso em flows)
// Diferente do useDepartments que filtra por user_id do proprietário
export const useAllDepartments = () => {
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['all-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          color,
          description,
          business_hours,
          department_members (
            id,
            agent_id,
            profiles:agent_id (id, full_name, username)
          )
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  return { departments, isLoading };
};
