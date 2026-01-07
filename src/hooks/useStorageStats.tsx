import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BucketStats {
  name: string;
  size: number;
  fileCount: number;
}

interface StorageStats {
  buckets: BucketStats[];
  totalSize: number;
  totalFiles: number;
  planLimit: number; // in bytes
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const useStorageStats = () => {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: async (): Promise<StorageStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const bucketNames = ['agent-documents'];
      const bucketStats: BucketStats[] = [];
      
      for (const bucketName of bucketNames) {
        try {
          // List all files in the bucket for this user
          const { data: files, error } = await supabase.storage
            .from(bucketName)
            .list(user.id, {
              limit: 1000,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (error) {
            console.error(`Error listing ${bucketName}:`, error);
            bucketStats.push({ name: bucketName, size: 0, fileCount: 0 });
            continue;
          }

          // Calculate total size
          let totalSize = 0;
          let fileCount = 0;

          if (files && files.length > 0) {
            for (const file of files) {
              if (file.metadata?.size) {
                totalSize += file.metadata.size;
                fileCount++;
              }
            }
          }

          bucketStats.push({
            name: bucketName,
            size: totalSize,
            fileCount
          });
        } catch (err) {
          console.error(`Error processing bucket ${bucketName}:`, err);
          bucketStats.push({ name: bucketName, size: 0, fileCount: 0 });
        }
      }

      // Also get agent_documents table sizes
      const { data: agentDocs } = await supabase
        .from('agent_documents')
        .select('file_size')
        .eq('user_id', user.id);

      const docsSize = agentDocs?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;
      
      // Update agent-documents bucket with DB data if storage API didn't return sizes
      const agentDocsBucket = bucketStats.find(b => b.name === 'agent-documents');
      if (agentDocsBucket && agentDocsBucket.size === 0 && docsSize > 0) {
        agentDocsBucket.size = docsSize;
        agentDocsBucket.fileCount = agentDocs?.length || 0;
      }

      const totalSize = bucketStats.reduce((acc, b) => acc + b.size, 0);
      const totalFiles = bucketStats.reduce((acc, b) => acc + b.fileCount, 0);
      
      // Plan limit: 101.6 MB per company
      const planLimit = 101.6 * 1024 * 1024;

      return {
        buckets: bucketStats,
        totalSize,
        totalFiles,
        planLimit
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
    formatBytes
  };
};
