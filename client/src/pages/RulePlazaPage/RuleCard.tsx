import React from 'react';
import { Download, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { useFileUrl } from '@/hooks/useFileUrl';
import type { RuleListItem } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface RuleCardProps {
  rule: RuleListItem;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule }) => {
  const fileUrl = useFileUrl(rule.file?.filePath);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {rule.name}
          </h3>
          {rule.content && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {rule.content}
            </p>
          )}
        </div>
      </div>

      {rule.effectiveTime && (
        <p className="text-xs text-muted-foreground">
          生效时间：{dayjs(rule.effectiveTime).format('YYYY-MM-DD')}
        </p>
      )}

      {fileUrl && (
        <UniversalLink
          to={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Download className="size-4" />
          下载文件
        </UniversalLink>
      )}
    </div>
  );
};

export default RuleCard;
