import { useState, useEffect } from 'react';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';

export function useFileUrl(filePath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void getDataloom().then((dataloom) => {
      if (cancelled) return;
      const downloadUrl = dataloom.storage
        .from(getDefaultBucketId())
        .generateDownloadUrlFromFilePath(filePath);
      setUrl(downloadUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return url;
}
