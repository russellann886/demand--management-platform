import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserIdentity } from '@/components/UserIdentity';
import { getDemandComments, createComment } from '@/api/demand';
import type { DemandCommentItem } from '@shared/api.interface';

interface CommentSectionProps {
  demandId: string;
  canComment: boolean;
}

export const CommentSection = ({
  demandId,
  canComment,
}: CommentSectionProps) => {
  const [comments, setComments] = useState<DemandCommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      const res = await getDemandComments(demandId, 1, 50);
      setComments(res.items);
      setTotal(res.total);
    } catch (error) {
      logger.error('获取评论失败', error);
    }
  };

  useEffect(() => {
    loadComments();
  }, [demandId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await createComment(demandId, { content: content.trim() });
      setContent('');
      toast.success('评论已发布');
      await loadComments();
    } catch (error) {
      logger.error('提交评论失败', error);
      toast.error('评论失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">
        评论补充{' '}
        {total > 0 && <span className="text-muted-foreground">({total})</span>}
      </h2>

      <div className="flex flex-col gap-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={canComment ? '补充你的建议...' : '登录后可发表评论'}
          rows={3}
          disabled={!canComment || submitting}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!canComment || submitting || !content.trim()}
          >
            {submitting ? '发布中...' : '发表评论'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {comments.length === 0 && (
          <span className="py-4 text-center text-sm text-muted-foreground">
            还没有评论，来发表第一条建议吧
          </span>
        )}
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex flex-col gap-2 border-b border-border/60 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between">
              <UserIdentity userId={comment.userId} />
              <span className="text-xs text-muted-foreground">
                {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words pl-1 text-sm text-foreground">
              {comment.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
