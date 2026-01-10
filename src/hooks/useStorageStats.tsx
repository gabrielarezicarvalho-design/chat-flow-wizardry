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
  planLimit: number;
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

      const totalSize = bucketStats.reduce((acc, b) => acc + b.size, 0);
      const totalFiles = bucketStats.reduce((acc, b) => acc + b.fileCount, 0);
      
      // Default plan limit: 1GB
      const planLimit = 1024 * 1024 * 1024;

      return {
        buckets: bucketStats,
        totalSize,
        totalFiles,
        planLimit
      };
    },
    staleTime: 60000,
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
    formatBytes
  };
};