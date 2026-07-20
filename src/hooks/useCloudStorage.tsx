import { useState, useCallback } from 'react';
import { uploadToVps, checkStorageHealth, VpsUploadResult } from '@/lib/cloud-storage';
import { toast } from 'sonner';

interface UseVpsStorageReturn {
  upload: (file: File, companySlug?: string) => Promise<VpsUploadResult>;
  isUploading: boolean;
  progress: number;
  checkHealth: () => Promise<boolean>;
}

/**
 * Hook para upload de arquivos na VPS storage.
 * Gerencia estado de upload, progresso e erros automaticamente.
 */
export const useCloudStorage = (): UseVpsStorageReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File, companySlug?: string): Promise<VpsUploadResult> => {
    setIsUploading(true);
    setProgress(0);

    const result = await uploadToVps(file, companySlug, (p) => setProgress(p));

    if (!result.success) {
      toast.error(result.error || 'Erro ao enviar arquivo');
    } else {
      toast.success(`Arquivo enviado: ${file.name}`);
    }

    // Reset after short delay
    setTimeout(() => {
      setProgress(0);
      setIsUploading(false);
    }, 800);

    return result;
  }, []);

  const checkHealth = useCallback(async () => {
    return checkStorageHealth();
  }, []);

  return { upload, isUploading, progress, checkHealth };
};
