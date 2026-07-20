import { useQuery } from '@tanstack/react-query';
import { listVpsFiles } from '@/lib/cloud-storage';

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
      const result = await listVpsFiles();
      
      let totalSize = 0;
      let fileCount = 0;

      if (result.success && result.files.length > 0) {
        for (const file of result.files) {
          totalSize += file.size || 0;
          fileCount++;
        }
      }

      const bucketStats: BucketStats[] = [{
        name: 'campaign-media',
        size: totalSize,
        fileCount
      }];

      // Lovable Cloud storage limit (ajuste conforme plano)
      const planLimit = 5 * 1024 * 1024 * 1024;

      return {
        buckets: bucketStats,
        totalSize,
        totalFiles: fileCount,
        planLimit
      };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });


  return {
    stats,
    isLoading,
    error,
    refetch,
    formatBytes
  };
};
