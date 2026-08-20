import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { mergedDemand as mergedDemandApi } from '@/api';

interface ManualMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  selectedDemandIds: string[];
  selectedTitles: string[];
  onSaved: () => void | Promise<void>;
}

const ManualMergeDialog: React.FC<ManualMergeDialogProps> = ({
  open,
  onOpenChange,
  categoryId,
  selectedDemandIds,
  selectedTitles,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setReason('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请填写整合后标题');
      return;
    }
    if (!reason.trim()) {
      toast.error('请填写整合说明');
      return;
    }
    if (selectedDemandIds.length < 2) {
      toast.error('请至少选择 2 条原始需求');
      return;
    }
    setSubmitting(true);
    try {
      await mergedDemandApi.createMergedDemand({
        categoryId,
        title: title.trim(),
        reason: reason.trim(),
        demandIds: selectedDemandIds,
      });
      toast.success('已保存整合需求');
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      logger.error('保存整合需求失败', err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>整合所选需求</DialogTitle>
          <DialogDescription>
            为所选的 {selectedDemandIds.length} 条原始需求填写整合后的标题与说明
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="merge-title">整合后标题</Label>
            <Input
              id="merge-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：统一的数据导出能力"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="merge-reason">整合说明 / 合并理由</Label>
            <Textarea
              id="merge-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="说明为什么这些需求可以整合，以及整合后的价值"
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label>所选原始需求（{selectedTitles.length}）</Label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/40 p-3">
              {selectedTitles.map((t, i) => (
                <Badge key={i} variant="secondary" className="font-normal">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualMergeDialog;
