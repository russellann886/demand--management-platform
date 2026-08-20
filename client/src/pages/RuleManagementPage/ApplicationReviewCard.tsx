import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserIdentity } from '@/components/UserIdentity';
import { rule as ruleApi } from '@/api';
import type { RuleListItem } from '@shared/api.interface';

const TYPE_BADGE: Record<string, string> = {
  加白: 'bg-green-100 text-green-700',
  加黑: 'bg-red-100 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  待审批: 'bg-yellow-100 text-yellow-700',
  已通过: 'bg-green-100 text-green-700',
  已驳回: 'bg-red-100 text-red-700',
};

interface ApplicationReviewCardProps {
  item: RuleListItem;
  onReviewed?: () => void;
}

const ApplicationReviewCard: React.FC<ApplicationReviewCardProps> = ({
  item,
  onReviewed,
}) => {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'已通过' | '已驳回'>(
    '已通过',
  );
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleOpenReview = (action: '已通过' | '已驳回') => {
    setReviewAction(action);
    setFeedback('');
    setReviewDialogOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await ruleApi.updateStatus(item.id, {
        status: reviewAction,
        reviewFeedback: feedback || undefined,
      });
      toast.success(reviewAction === '已通过' ? '已通过' : '已驳回');
      setReviewDialogOpen(false);
      onReviewed?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-medium text-foreground">
              {item.name}
            </h4>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                TYPE_BADGE[item.type] ?? ''
              }`}
            >
              {item.type}
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                STATUS_BADGE[item.status] ?? ''
              }`}
            >
              {item.status}
            </span>
          </div>
          {item.reason && (
            <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
          )}
        </div>
        {item.status === '待审批' && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenReview('已驳回')}
            >
              <X className="size-4" />
              驳回
            </Button>
            <Button size="sm" onClick={() => handleOpenReview('已通过')}>
              <Check className="size-4" />
              通过
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>提交人：</span>
          <UserIdentity userId={item.creator} />
        </div>
        <span>
          提交时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
        </span>
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === '已通过' ? '通过申请' : '驳回申请'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              审批意见
            </label>
            <Textarea
              value={feedback}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFeedback(e.target.value)
              }
              placeholder="请输入审批意见（可选）"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? '提交中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationReviewCard;
