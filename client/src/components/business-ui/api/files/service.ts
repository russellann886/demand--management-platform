'use client';

export type FilePurpose = 'image' | 'rule' | 'attachment';

export interface UploadFileData {
  id: string;
  filePath: string;
  bucketId: string;
  url: string;
  downloadUrl: string;
}

interface ApiErrorPayload {
  error?: {
    message?: string;
  };
}

export async function uploadFile(
  file: File,
  purpose: FilePurpose = file.type.startsWith('image/')
    ? 'image'
    : 'attachment',
): Promise<UploadFileData> {
  const form = new FormData();
  form.set('file', file);
  form.set('purpose', purpose);

  const response = await fetch('/api/files', {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
  });
  if (!response.ok) {
    throw await fileApiError(response, '文件上传失败');
  }

  return response.json() as Promise<UploadFileData>;
}

export function getFileUrl(filePath: string, download = false): string {
  const route = download ? 'download' : 'content';
  return `/api/files/${route}?key=${encodeURIComponent(filePath)}`;
}

export async function deleteFile(filePath: string): Promise<void> {
  const response = await fetch(
    `/api/files?key=${encodeURIComponent(filePath)}`,
    {
      method: 'DELETE',
      credentials: 'same-origin',
    },
  );
  if (!response.ok) {
    throw await fileApiError(response, '文件删除失败');
  }
}

async function fileApiError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const payload = (await response
    .json()
    .catch(() => null)) as ApiErrorPayload | null;
  return new Error(
    payload?.error?.message ?? `${fallback} (${response.status})`,
  );
}
