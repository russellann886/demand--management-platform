import { Image as UIImage } from '@/components/ui/image';
import { useFileUrl } from '@/hooks/useFileUrl';
import { cn } from '@/lib/utils';

interface FileImageProps {
  filePath: string;
  alt: string;
  className?: string;
}

export const FileImage = ({ filePath, alt, className }: FileImageProps) => {
  const url = useFileUrl(filePath);
  if (!url) {
    return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
  }
  return <UIImage src={url} alt={alt} className={className} />;
};
