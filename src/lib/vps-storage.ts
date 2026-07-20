import { getSubdomainSlug } from './subdomain';

const VPS_STORAGE_BASE_URL = 'https://marketflowchat.com.br/api/storage';

/**
 * Resolves the company slug for storage operations.
 * Uses subdomain if available, otherwise falls back to provided companySlug.
 */
function resolveCompanySlug(companySlug?: string): string | null {
  return getSubdomainSlug() || companySlug || null;
}

/**
 * Check if the VPS storage API is healthy.
 */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${VPS_STORAGE_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export interface VpsUploadResult {
  success: boolean;
  url: string;
  fileName: string;
  error?: string;
}

/**
 * Upload a file to the VPS storage API.
 * @param file - The file to upload
 * @param companySlug - Company slug (auto-detected from subdomain if not provided)
 * @param onProgress - Optional progress callback (0-100)
 */
export async function uploadToVps(
  file: File,
  companySlug?: string,
  onProgress?: (progress: number) => void
): Promise<VpsUploadResult> {
  const slug = resolveCompanySlug(companySlug);
  if (!slug) {
    return {
      success: false,
      url: '',
      fileName: '',
      error: 'Empresa não identificada. Não é possível fazer upload.',
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    // Simulate progress since fetch doesn't provide native upload progress
    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue = Math.min(progressValue + 8, 90);
      onProgress?.(progressValue);
    }, 150);

    const res = await fetch(`${VPS_STORAGE_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'X-Company': slug,
      },
      body: formData,
    });

    clearInterval(progressInterval);

    if (!res.ok) {
      const errorText = await res.text();
      return {
        success: false,
        url: '',
        fileName: '',
        error: `Erro no upload: ${res.status} - ${errorText}`,
      };
    }

    onProgress?.(100);

    const data = await res.json();

    // Build the download URL
    const downloadUrl = `${VPS_STORAGE_BASE_URL}/download/${slug}/${data.fileName || file.name}`;

    return {
      success: true,
      url: downloadUrl,
      fileName: data.fileName || file.name,
    };
  } catch (error: any) {
    return {
      success: false,
      url: '',
      fileName: '',
      error: error.message || 'Erro desconhecido no upload',
    };
  }
}

/**
 * Upload a Blob (e.g. audio recording) to the VPS storage API.
 */
export async function uploadBlobToVps(
  blob: Blob,
  fileName: string,
  companySlug?: string,
  onProgress?: (progress: number) => void
): Promise<VpsUploadResult> {
  const file = new File([blob], fileName, { type: blob.type });
  return uploadToVps(file, companySlug, onProgress);
}

/**
 * List files stored on the VPS for a given company.
 */
export async function listVpsFiles(companySlug?: string): Promise<{ success: boolean; files: VpsFileInfo[]; error?: string }> {
  const slug = resolveCompanySlug(companySlug);
  if (!slug) {
    return { success: false, files: [], error: 'Empresa não identificada.' };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${VPS_STORAGE_BASE_URL}/files/${slug}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { success: false, files: [], error: `Erro: ${res.status}` };
    }
    const data = await res.json();
    return { success: true, files: data.files || [] };
  } catch (error: any) {
    clearTimeout(timeoutId);
    return { success: false, files: [], error: error?.name === 'AbortError' ? 'Timeout' : error.message };
  }
}


export interface VpsFileInfo {
  name: string;
  size: number;
  createdAt: string;
  mimetype?: string;
}

/**
 * Delete a file from VPS storage.
 */
export async function deleteVpsFile(fileName: string, companySlug?: string): Promise<{ success: boolean; error?: string }> {
  const slug = resolveCompanySlug(companySlug);
  if (!slug) {
    return { success: false, error: 'Empresa não identificada.' };
  }
  try {
    const res = await fetch(`${VPS_STORAGE_BASE_URL}/delete/${slug}/${fileName}`, { method: 'DELETE' });
    if (!res.ok) {
      return { success: false, error: `Erro: ${res.status}` };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get the public download URL for a file on the VPS.
 */
export function getVpsDownloadUrl(companySlug: string, fileName: string): string {
  return `${VPS_STORAGE_BASE_URL}/download/${companySlug}/${fileName}`;
}

/**
 * Get the VPS storage base URL (for reference).
 */
export function getVpsStorageBaseUrl(): string {
  return VPS_STORAGE_BASE_URL;
}
