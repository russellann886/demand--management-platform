import React, { useEffect, useMemo, useState } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SubmitterDisplay } from '@/components/SubmitterDisplay';
import { mergedDemand as mergedDemandApi } from '@/api';
import type { SourceDemandItem } from '@shared/api.interface';

interface AddSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mergedDemandId: string;
  mergedTitle: string;
  candidates: SourceDemandItem[];
  onSaved: () => void | Promise<void>;
}

const AddSourcesDialog: React.FC<AddSourcesDialogProps> = ({
  open,
  onOpenChange,
  mergedDemandId,
  mergedTitle,
  candidates,
  onSaved,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
    }
  }, [open]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedCount = selectedIds.length;

  const hasCandidates = useMemo(() => candidates.length > 0, [candidates]);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error('请至少选择 1 条原始需求');
      return;
    }
    setSubmitting(true);
    try {
      await mergedDemandApi.addSourcesToMerged(mergedDemandId, {
        demandIds: selectedIds,
      });
      toast.success('已将所选原始需求加入整合需求');
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      logger.error(
        '添加原始需求失败',
        err instanceof Error ? err.message : String(err),
      );
      toast.error(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加原始需求</DialogTitle>
          <DialogDescription>
            选择要加入「{mergedTitle}」的未整合原始需求
          </DialogDescription>
        </DialogHeader>

        {hasCandidates ? (
          <div className="max-h-[360px] space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
            {candidates.map((item) => {
              const plainText = (item.background || item.title || '')
                .replace(/<[^>]*>/g, '')
                .trim();
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                    className="mt-0.5"
                  />
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words whitespace-pre-wrap text-sm font-medium text-foreground">
                        {plainText || '—'}
                      </p>
                      {(item.department || item.creator || item.submitterName) && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          {item.department && <span>{item.department}</span>}
                          {item.department &&
                            (item.creator || item.submitterName) && (
                              <span aria-hidden>·</span>
                            )}
                          {(item.creator || item.submitterName) && (
                            <SubmitterDisplay
                              creator={item.creator}
                              submitterName={item.submitterName}
                              size="small"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
            暂无可添加的未整合原始需求
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !hasCandidates || selectedCount === 0}
          >
            {submitting ? '添加中...' : `添加所选（${selectedCount}）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSourcesDialog;
