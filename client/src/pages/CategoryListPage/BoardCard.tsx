import React from 'react';
import {
  Package,
  Ticket,
  LayoutGrid,
  Rocket,
  RefreshCw,
  Store,
  FileText,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { UserIdentity } from '@/components/UserIdentity';
import { STATUS_ORDER, PROGRESS_BAR_COLORS } from './status-constants';

const ICON_MAP: Record<string, LucideIcon> = {
  Package,
  Ticket,
  LayoutGrid,
  Rocket,
  RefreshCw,
  Store,
  FileText,
};

interface BoardCardProps {
  name: string;
  description: string;
  icon: string;
  count?: number;
  countLabel?: string;
  statusCounts?: Record<string, number>;
  totalDemand?: number;
  admins?: string[];
  onClick: () => void;
}

const BoardCard: React.FC<BoardCardProps> = ({
  name,
  description,
  icon,
  count,
  countLabel = '个栏目',
  statusCounts,
  totalDemand,
  admins,
  onClick,
}) => {
  const IconComponent = ICON_MAP[icon] ?? LayoutGrid;
  const hasProgress = statusCounts && (totalDemand ?? 0) > 0;
  const hasAdmins = admins && admins.length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <IconComponent className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {count !== undefined && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {count} {countLabel}
            </span>
          )}
          <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {hasProgress && (
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {STATUS_ORDER.map((status) => (
              <span key={status} className="flex items-center gap-1">
                <span
                  className={`size-2 rounded-full ${PROGRESS_BAR_COLORS[status]}`}
                />
                {status} {statusCounts?.[status] ?? 0}
              </span>
            ))}
          </div>
          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
            {STATUS_ORDER.map((status) => {
              const c = statusCounts?.[status] ?? 0;
              if (c === 0) return null;
              return (
                <div
                  key={status}
                  className={PROGRESS_BAR_COLORS[status]}
                  style={{ width: `${(c / (totalDemand as number)) * 100}%` }}
                />
              );
            })}
          </div>
        </div>
      )}

      {hasAdmins && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">管理员</span>
          {admins.slice(0, 3).map((userId) => (
            <UserIdentity key={userId} userId={userId} />
          ))}
          {admins.length > 3 && (
            <span className="text-xs text-muted-foreground">
              另有 {admins.length - 3} 人
            </span>
          )}
        </div>
      )}
    </button>
  );
};

export default BoardCard;
