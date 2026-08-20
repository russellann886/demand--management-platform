import { useMemo } from 'react';
import { getFileUrl } from '@/components/business-ui/api/files/service';

export function useFileUrl(
  filePath: string | null | undefined,
  download = false,
): string | null {
  return useMemo(
    () => (filePath ? getFileUrl(filePath, download) : null),
    [download, filePath],
  );
}
