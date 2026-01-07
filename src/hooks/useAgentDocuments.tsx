import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const useAgentDocuments = (agentId: string | null) => {
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['agent-documents', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from('agent_documents')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgentDocument[];
    },
    enabled: !!agentId
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, agentId }: { file: File; agentId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Determine file type
      const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      if (!['pdf', 'txt', 'docx', 'doc'].includes(fileType)) {
        throw new Error('Tipo de arquivo não suportado. Use PDF, TXT ou DOCX.');
      }

      // Upload to storage
      const filePath = `${user.id}/${agentId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('agent-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('agent_documents')
        .insert({
          agent_id: agentId,
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_type: fileType,
          file_size: file.size,
          status: 'processing'
        })
        .select()
        .single();

      if (error) throw error;

      // Process document content (extract text)
      // For TXT files, we can read directly
      if (fileType === 'txt') {
        const text = await file.text();
        await supabase
          .from('agent_documents')
          .update({ content_text: text, status: 'ready' })
          .eq('id', data.id);
      } else {
        // For PDF/DOCX, we'd call an edge function to process
        // For now, mark as ready (processing would be async)
        await supabase.functions.invoke('process-document', {
          body: { documentId: data.id, filePath }
        }).catch(() => {
          // If function doesn't exist yet, just mark as ready
          supabase
            .from('agent_documents')
            .update({ status: 'ready' })
            .eq('id', data.id);
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-documents', agentId] });
      toast.success('Documento enviado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar documento');
    }
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const doc = documents?.find(d => d.id === documentId);
      if (!doc) throw new Error('Documento não encontrado');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('agent-documents')
        .remove([doc.file_path]);

      if (storageError) console.error('Error deleting from storage:', storageError);

      // Delete record
      const { error } = await supabase
        .from('agent_documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-documents', agentId] });
      toast.success('Documento excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir documento');
    }
  });

  return {
    documents: documents || [],
    isLoading,
    uploadDocument,
    deleteDocument
  };
};
