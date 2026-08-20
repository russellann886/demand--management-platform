import React from 'react';
import { Unlink, FileText, Link as LinkIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import { FileImage } from '@/components/FileImage';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SubmitterDisplay } from '@/components/SubmitterDisplay';
import { Input } from '@/components/ui/input';
import { updateDemandStatus, updateDemandScore } from '@/api/demand';
import { mergedDemand as mergedDemandApi } from '@/api';
import type { UnifiedRow, ResolvedSource } from './unified-rows';
import { computeAutoScore, getRowFinalScore } from './unified-rows';
import { SCORE_LEVEL_META, type ScoreLevel } from './demand-scoring';
import type {
  FormFieldDefinition,
  CustomFields,
  CustomFieldValue,
} from '@shared/api.interface';

export function extractLinks(html: string | null | undefined): string[] {
  if (!html) return [];
  const result = new Set<string>();
  const anchorRe = /<a[^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, '&');
    if (/^https?:\/\//i.test(href)) result.add(href);
  }
  const plain = html.replace(/<[^>]*>/g, ' ');
  const urlRe = /https?:\/\/[^\s<>"']+/gi;
  let m2: RegExpExecArray | null;
  while ((m2 = urlRe.exec(plain)) !== null) {
    result.add(m2[0].replace(/&amp;/g, '&'));
  }
  return Array.from(result);
}

export function extractImages(html: string | null | undefined): string[] {
  if (!html) return [];
  const result: string[] = [];
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const src = m[1].replace(/&amp;/g, '&');
    if (!result.includes(src)) result.push(src);
  }
  return result;
}

export function extractTextFromHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export const ImageThumbs: React.FC<{ images: string[] }> = ({ images }) => {
  if (images.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {images.map((src, i) => (
        <Dialog key={i}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="block size-10 cursor-zoom-in overflow-hidden rounded-md border border-border"
            >
              <Image
                src={src}
                className="size-full object-cover"
                alt="示意图"
              />
            </button>
          </DialogTrigger>
          <DialogContent className="flex max-w-3xl items-center justify-center bg-transparent p-2 shadow-none">
            <Image
              src={src}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
              alt="示意图"
            />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
};

export const STATUS_OPTIONS = ['待处理', '跟进中', '已完成', '已关闭'];

const STATUS_STYLES: Record<string, string> = {
  待处理: 'border-border bg-muted/30 text-muted-foreground',
  跟进中: 'border-primary/30 bg-primary/10 text-primary',
  已完成: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  已关闭: 'border-muted-foreground/20 bg-muted/40 text-muted-foreground/70',
};

export const ScoreCell: React.FC<{
  record: UnifiedRow;
  level: ScoreLevel;
  onRefresh?: () => void;
}> = ({ record, level, onRefresh }) => {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const finalScore = getRowFinalScore(record);
  const autoScore = computeAutoScore(record);
  const meta = SCORE_LEVEL_META[level];

  const [value, setValue] = React.useState('');
  React.useEffect(() => {
    if (open) {
      setValue(
        record.manualScore !== null && record.manualScore !== undefined
          ? String(record.manualScore)
          : '',
      );
    }
  }, [open, record.manualScore]);

  const submit = async (manualScore: number | null) => {
    setSaving(true);
    try {
      if (record.type === 'merged') {
        await mergedDemandApi.updateMergedDemand(record.id, { manualScore });
      } else {
        await updateDemandScore(record.id, { manualScore });
      }
      setOpen(false);
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed === '') {
      submit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      toast.error('请输入有效数字');
      return;
    }
    submit(parsed);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex min-w-[36px] items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums transition hover:opacity-80 ${meta.className}`}
          title={
            record.manualScore !== null && record.manualScore !== undefined
              ? `手动分（自动计算 ${Math.floor(autoScore)}），点击编辑`
              : '点击手动调整分数'
          }
        >
          {Math.floor(finalScore)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2" align="start">
        <p className="text-xs font-medium text-foreground">手动调整分数</p>
        <p className="text-xs text-muted-foreground">
          自动计算分：{Math.floor(autoScore)}；留空并保存则恢复自动计算
        </p>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          placeholder="输入分数"
          className="h-8 text-xs"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => submit(null)}
          >
            清除
          </Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            保存
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const FeedbackCell: React.FC<{
  feedback: string | null;
  record: UnifiedRow;
  onRefresh?: () => void;
}> = ({ feedback, record, onRefresh }) => {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(feedback || '');

  const saveFeedback = async () => {
    try {
      if (record.type === 'merged') {
        await mergedDemandApi.updateMergedDemand(record.id, {
          followUpFeedback: value || null,
        });
      }
      onRefresh?.();
    } catch {
      // error handled by api layer
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={saveFeedback}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveFeedback();
        }}
        placeholder="输入反馈..."
        className="h-8 text-xs"
        autoFocus
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer truncate text-xs text-muted-foreground hover:text-foreground"
      title={feedback || '点击输入跟进反馈'}
    >
      {feedback || (
        <span className="text-muted-foreground/50">点击输入...</span>
      )}
    </div>
  );
};

export const StatusCell: React.FC<{
  record: UnifiedRow;
  onRefresh?: () => void;
}> = ({ record, onRefresh }) => {
  const currentStatus = record.status || '待处理';
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = React.useState<Date | undefined>(
    undefined,
  );
  const [saving, setSaving] = React.useState(false);

  const persist = async (
    newStatus: string,
    plannedSchedule?: string | null,
  ) => {
    setSaving(true);
    try {
      if (record.type === 'merged') {
        await mergedDemandApi.updateMergedDemand(record.id, {
          status: newStatus,
          ...(plannedSchedule !== undefined ? { plannedSchedule } : {}),
        });
      } else {
        await updateDemandStatus(record.id, newStatus, plannedSchedule);
      }
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新状态失败');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    if (newStatus === '跟进中' && !record.assignee) {
      toast.error('请先指派负责人后再将状态改为跟进中');
      return;
    }
    if (currentStatus === '待处理' && newStatus !== '待处理') {
      setPendingStatus(newStatus);
      setScheduleDate(
        record.plannedSchedule ? new Date(record.plannedSchedule) : undefined,
      );
      setDialogOpen(true);
      return;
    }
    persist(newStatus);
  };

  const handleConfirmSchedule = async () => {
    if (!pendingStatus || !scheduleDate) return;
    await persist(pendingStatus, scheduleDate.toISOString());
    setDialogOpen(false);
    setPendingStatus(null);
  };

  return (
    <>
      <Select value={currentStatus} onValueChange={handleValueChange}>
        <SelectTrigger
          className={`h-7 w-[85px] text-xs ${STATUS_STYLES[currentStatus] ?? ''}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>设置预计排期</DialogTitle>
            <DialogDescription>
              将状态改为「{pendingStatus}」需为该需求选择一个预计排期日期。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <Calendar
              mode="single"
              selected={scheduleDate}
              onSelect={setScheduleDate}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmSchedule}
              disabled={!scheduleDate || saving}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const StackedCell: React.FC<{
  record: UnifiedRow;
  renderValue: (item: UnifiedRow | ResolvedSource) => React.ReactNode;
}> = ({ record, renderValue }) => {
  const sources = record.sources ?? [];
  const showSources = record.type === 'merged' && sources.length > 0;
  if (showSources) {
    return (
      <div className="flex flex-col gap-1">
        {sources.map((s) => (
          <div key={s.demandId} className="text-xs">
            {renderValue(s)}
          </div>
        ))}
      </div>
    );
  }
  return <div className="text-xs">{renderValue(record)}</div>;
};

export function renderCustomFieldValue(
  field: FormFieldDefinition,
  customFields: CustomFields,
): React.ReactNode {
  if (!customFields) return <span className="text-muted-foreground">—</span>;
  const value = customFields[field.id] as CustomFieldValue;
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <span className="block max-w-[200px] truncate text-xs text-foreground">
          {String(value)}
        </span>
      );
    case 'date':
      return (
        <span className="text-xs text-foreground">
          {dayjs(String(value)).format('YYYY-MM-DD')}
        </span>
      );
    case 'link':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <LinkIcon className="size-3 shrink-0" />
          <span className="max-w-[150px] truncate">{String(value)}</span>
        </a>
      );
    case 'image': {
      const fa = value as { bucketId: string; filePath: string };
      return (
        <FileImage
          filePath={fa.filePath}
          alt={field.label}
          className="size-10 rounded-md border border-border object-cover"
        />
      );
    }
    case 'select':
      return (
        <Badge variant="secondary" className="font-normal">
          {String(value)}
        </Badge>
      );
    default:
      return null;
  }
}

export const HIDDEN_TITLES_WHEN_CUSTOM = new Set([
  '链接',
  '示意',
  '需求类型',
  '优先级',
  '是否阻塞',
  '预期价值',
  '期望上线时间',
]);

export const ExpandedSources: React.FC<{
  mergedId: string;
  sources: ResolvedSource[];
  onReleaseSource: (mergedDemandId: string, demandId: string) => void;
}> = ({ mergedId, sources, onReleaseSource }) => {
  if (sources.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">暂无关联的原始需求</p>
    );
  }
  return (
    <div className="space-y-2 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        关联的原始需求（{sources.length}）
      </p>
      <div className="divide-y divide-border rounded-lg border border-border bg-background">
        {sources.map((s) => (
          <div
            key={s.demandId}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium text-foreground">
                  {s.exists ? s.title : `${s.title}（已删除）`}
                </span>
              </div>
              {(() => {
                const links = extractLinks(s.background);
                if (links.length === 0) return null;
                return (
                  <div className="flex flex-col gap-0.5 pl-6">
                    {links.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={url}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <LinkIcon className="size-3 shrink-0" />
                        <span className="max-w-[220px] truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {(() => {
                const images = extractImages(s.background);
                if (images.length === 0) return null;
                return <ImageThumbs images={images} />;
              })()}
              {s.department && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {s.department}
                </span>
              )}
              {(s.creator || s.submitterName) && (
                <SubmitterDisplay
                  creator={s.creator ?? ''}
                  submitterName={s.submitterName}
                  size="small"
                />
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <Unlink className="size-4" />
                    释放
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>释放该原始需求？</AlertDialogTitle>
                    <AlertDialogDescription>
                      释放后「{s.title}
                      」将从此整合需求移除，重新回到原始需求列表。
                      若整合需求剩余关联不足 2 条，整条整合需求将自动解散。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onReleaseSource(mergedId, s.demandId)}
                    >
                      确认释放
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
