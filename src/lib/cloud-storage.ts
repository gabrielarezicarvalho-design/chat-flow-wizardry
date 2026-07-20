import { supabase } from '@/integrations/supabase/client';
import { getSubdomainSlug } from './subdomain';

/**
 * Storage backend: Lovable Cloud (Supabase Storage), bucket `campaign-media`.
 * A API pública deste módulo foi preservada para compatibilidade com o código
 * legado que ainda importa nomes com prefixo "Vps".
 */
const BUCKET = 'campaign-media';

function resolveCompanySlug(companySlug?: string): string {
  return getSubdomainSlug() || companySlug || 'default';
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export interface VpsUploadResult {
  success: boolean;
  url: string;
  fileName: string;
  error?: string;
}

export interface VpsFileInfo {
  name: string;
  size: number;
  createdAt: string;
  mimetype?: string;
}

/** Ping do storage — sempre disponível via Lovable Cloud. */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
    return !error;
  } catch {
    return false;
  }
}

/** Upload de arquivo para o bucket `campaign-media`, particionado por empresa. */
export async function uploadToVps(
  file: File,
  companySlug?: string,
  onProgress?: (progress: number) => void
): Promise<VpsUploadResult> {
  const slug = resolveCompanySlug(companySlug);
  const safeName = sanitize(file.name);
  const path = `${slug}/${Date.now()}-${safeName}`;

  // Progresso simulado — Supabase JS não expõe upload progress nativo.
  let progressValue = 0;
  const progressInterval = setInterval(() => {
    progressValue = Math.min(progressValue + 8, 90);
    onProgress?.(progressValue);
  }, 150);

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    clearInterval(progressInterval);

    if (error) {
      return { success: false, url: '', fileName: '', error: error.message };
    }

    onProgress?.(100);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return {
      success: true,
      url: data.publicUrl,
      fileName: path,
    };
  } catch (error: any) {
    clearInterval(progressInterval);
    return {
      success: false,
      url: '',
      fileName: '',
      error: error?.message || 'Erro desconhecido no upload',
    };
  }
}

/** Upload de Blob (áudio, screenshots, etc.). */
export async function uploadBlobToVps(
  blob: Blob,
  fileName: string,
  companySlug?: string,
  onProgress?: (progress: number) => void
): Promise<VpsUploadResult> {
  const file = new File([blob], fileName, { type: blob.type });
  return uploadToVps(file, companySlug, onProgress);
}

/** Lista arquivos da empresa dentro do bucket. */
export async function listVpsFiles(
  companySlug?: string
): Promise<{ success: boolean; files: VpsFileInfo[]; error?: string }> {
  const slug = resolveCompanySlug(companySlug);
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(slug, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      return { success: false, files: [], error: error.message };
    }

    const files: VpsFileInfo[] = (data || [])
      .filter((f) => f.name && f.name !== '.emptyFolderPlaceholder')
      .map((f) => ({
        name: f.name,
        size: (f.metadata as any)?.size ?? 0,
        createdAt: f.created_at ?? new Date().toISOString(),
        mimetype: (f.metadata as any)?.mimetype,
      }));

    return { success: true, files };
  } catch (error: any) {
    return { success: false, files: [], error: error?.message || 'Erro ao listar arquivos' };
  }
}

/** Remove um arquivo do storage. */
export async function deleteVpsFile(
  fileName: string,
  companySlug?: string
): Promise<{ success: boolean; error?: string }> {
  const slug = resolveCompanySlug(companySlug);
  // Aceita tanto o path completo ({slug}/arquivo) quanto só o nome.
  const path = fileName.includes('/') ? fileName : `${slug}/${fileName}`;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao remover arquivo' };
  }
}

/** Retorna URL pública de um arquivo. */
export function getVpsDownloadUrl(companySlug: string, fileName: string): string {
  const path = fileName.includes('/') ? fileName : `${companySlug}/${fileName}`;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Base URL do storage (mantido para compatibilidade). */
export function getVpsStorageBaseUrl(): string {
  return `supabase-storage://${BUCKET}`;
}
