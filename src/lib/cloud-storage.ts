import { getSubdomainSlug } from './subdomain';

/**
 * Storage backend: VPS Storage API (Node/Express em /var/www/marketflow/storage-api).
 * Endpoints proxied pelo Nginx em /api/storage/*.
 */

const DEFAULT_STORAGE_BASE = 'https://ia.marketflowchat.com.br';

function getStorageBase(): string {
  const envUrl = (import.meta as any).env?.VITE_STORAGE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');
  // Em produção (subdomínio .marketflowchat.com.br) usa mesma origem
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('marketflowchat.com.br')) {
      return `${window.location.protocol}//${host}`;
    }
  }
  return DEFAULT_STORAGE_BASE;
}

function resolveCompanySlug(companySlug?: string): string {
  return getSubdomainSlug() || companySlug || 'default';
}

export interface CloudUploadResult {
  success: boolean;
  url: string;
  fileName: string;
  error?: string;
}

export interface CloudFileInfo {
  name: string;
  size: number;
  createdAt: string;
  mimetype?: string;
}

/** Health check da Storage API na VPS. */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getStorageBase()}/api/storage/health`, {
      method: 'GET',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Upload multipart para a VPS. */
export async function uploadToCloud(
  file: File,
  companySlug?: string,
  onProgress?: (progress: number) => void
): Promise<CloudUploadResult> {
  const slug = resolveCompanySlug(companySlug);
  const base = getStorageBase();

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);

    xhr.open('POST', `${base}/api/storage/upload`);
    xhr.setRequestHeader('X-Company', slug);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          onProgress?.(100);
          resolve({
            success: true,
            url: `${base}${data.url}`,
            fileName: data.fileName,
          });
        } else {
          resolve({
            success: false,
            url: '',
            fileName: '',
            error: data.error || `HTTP ${xhr.status}`,
          });
        }
      } catch (err: any) {
        resolve({ success: false, url: '', fileName: '', error: err?.message || 'Resposta inválida' });
      }
    };

    xhr.onerror = () => {
      resolve({ success: false, url: '', fileName: '', error: 'Falha de rede no upload' });
    };

    xhr.send(form);
  });
}

/** Upload de Blob (áudio, screenshots, etc.). */
export async function uploadBlobToCloud(
  blob: Blob,
  fileName: string,
  companySlug?: string,
  onProgress?: (progress: number) => void
): Promise<CloudUploadResult> {
  const file = new File([blob], fileName, { type: blob.type });
  return uploadToCloud(file, companySlug, onProgress);
}

/** Lista arquivos da empresa na VPS. */
export async function listCloudFiles(
  companySlug?: string
): Promise<{ success: boolean; files: CloudFileInfo[]; error?: string }> {
  const slug = resolveCompanySlug(companySlug);
  try {
    const res = await fetch(`${getStorageBase()}/api/storage/files/${slug}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, files: [], error: data?.error || `HTTP ${res.status}` };
    }
    return { success: true, files: data.files || [] };
  } catch (error: any) {
    return { success: false, files: [], error: error?.message || 'Erro ao listar arquivos' };
  }
}

/** Remove um arquivo da VPS. */
export async function deleteCloudFile(
  fileName: string,
  companySlug?: string
): Promise<{ success: boolean; error?: string }> {
  const slug = resolveCompanySlug(companySlug);
  const name = fileName.includes('/') ? fileName.split('/').pop()! : fileName;
  try {
    const res = await fetch(
      `${getStorageBase()}/api/storage/delete/${slug}/${encodeURIComponent(name)}`,
      { method: 'DELETE' }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao remover arquivo' };
  }
}

/** URL pública de download de um arquivo na VPS. */
export function getCloudDownloadUrl(companySlug: string, fileName: string): string {
  const name = fileName.includes('/') ? fileName.split('/').pop()! : fileName;
  return `${getStorageBase()}/api/storage/download/${companySlug}/${encodeURIComponent(name)}`;
}

/** Uso em disco (bytes + count) do tenant na VPS. */
export async function getCloudUsage(
  companySlug?: string
): Promise<{ success: boolean; totalSize: number; fileCount: number; error?: string }> {
  const slug = resolveCompanySlug(companySlug);
  try {
    const res = await fetch(`${getStorageBase()}/api/storage/usage/${slug}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, totalSize: 0, fileCount: 0, error: data?.error || `HTTP ${res.status}` };
    }
    return { success: true, totalSize: data.totalSize || 0, fileCount: data.fileCount || 0 };
  } catch (error: any) {
    return { success: false, totalSize: 0, fileCount: 0, error: error?.message || 'Erro ao obter uso' };
  }
}

/** Base URL do storage. */
export function getCloudStorageBaseUrl(): string {
  return getStorageBase();
}
