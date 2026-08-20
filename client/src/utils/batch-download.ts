import JSZip from 'jszip';
import { toast } from 'sonner';
import { getFileUrl } from '@/components/business-ui/api/files/service';
import type {
  SourceDemandItem,
  FormFieldDefinition,
  FileAttachment,
} from '@shared/api.interface';

export interface ImageDownloadItem {
  name: string;
  filePath: string;
}

const CONCURRENCY = 5;
const BLOB_EXT_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export function collectImagePaths(
  demands: SourceDemandItem[],
  formFields: FormFieldDefinition[] | null,
): ImageDownloadItem[] {
  const imageFields =
    formFields?.filter((f: FormFieldDefinition) => f.type === 'image') ?? [];
  const items: ImageDownloadItem[] = [];
  for (const d of demands) {
    const base = sanitize(d.title);
    if (d.image?.filePath) {
      items.push({ name: `${base}_图片`, filePath: d.image.filePath });
    }
    if (d.customFields) {
      for (const f of imageFields) {
        const v = d.customFields[f.id];
        if (v && typeof v === 'object' && 'filePath' in v) {
          items.push({
            name: `${base}_${sanitize(f.label)}`,
            filePath: (v as FileAttachment).filePath,
          });
        }
      }
    }
  }
  return items;
}

export async function downloadFilesAsZip(
  items: ImageDownloadItem[],
  zipName: string,
): Promise<void> {
  if (items.length === 0) {
    toast.warning('没有可下载的图片');
    return;
  }
  toast.info(`正在准备 ${items.length} 个文件...`);
  const zip = new JSZip();
  const used = new Set<string>();
  let ok = 0;
  let fail = 0;
  const urls = items.map((i: ImageDownloadItem) => ({
    name: i.name,
    filePath: i.filePath,
    url: getFileUrl(i.filePath, true),
  }));
  await runPool(
    urls,
    CONCURRENCY,
    async (u: { name: string; filePath: string; url: string }) => {
      try {
        const res = await fetch(u.url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const ext = extractExt(u.filePath) || BLOB_EXT_MAP[blob.type] || 'jpg';
        const fn = dedupe(`${u.name}.${ext}`, used);
        zip.file(fn, blob);
        ok++;
      } catch (e) {
        fail++;
        console.error(`下载失败: ${u.name}`, e);
      }
    },
  );
  if (ok === 0) {
    toast.error('全部文件下载失败');
    return;
  }
  toast.info('正在打包...');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  triggerDownload(blob, zipName);
  if (fail > 0) toast.warning(`已下载 ${ok} 个文件，${fail} 个失败`);
  else toast.success(`已下载 ${ok} 个文件`);
}

function sanitize(name: string): string {
  return (
    name
      .replace(/[/\\:*?"<>|]/g, '_')
      .trim()
      .slice(0, 50) || '未命名'
  );
}

function extractExt(url: string): string | null {
  const clean = url.split('?')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = clean.slice(dot + 1).toLowerCase();
  return ext.length <= 5 && /^[a-z0-9]+$/.test(ext) ? ext : null;
}

function dedupe(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  while (used.has(`${base}_${n}${ext}`)) n++;
  const r = `${base}_${n}${ext}`;
  used.add(r);
  return r;
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const worker = async (): Promise<void> => {
    while (i < items.length) await fn(items[i++]);
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
}
