import React from 'react';
import { ChevronRight, FolderOpen, Pencil } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { DemandCategory } from '@shared/api.interface';
import { STATUS_ORDER, PROGRESS_BAR_COLORS } from './status-constants';

interface CategoryCardProps {
  category: DemandCategory;
  manageMode?: boolean;
  countLabel?: string;
  showStatusProgress?: boolean;
  onOpen: (category: DemandCategory) => void;
  onEdit?: (category: DemandCategory) => void;
  onToggleEnabled?: (category: DemandCategory, next: boolean) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  manageMode = false,
  countLabel = '条需求',
  showStatusProgress = false,
  onOpen,
  onEdit,
  onToggleEnabled,
}) => {
  const disabled = !category.enabled;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(category)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(category);
        }
      }}
      className={`group flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <FolderOpen className="size-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-semibold text-foreground">
            {category.name}
          </h3>
          {disabled && (
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              已停用
            </Badge>
          )}
        </div>
        {category.description && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {category.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Badge variant="secondary" className="font-normal">
          {category.demandCount} {countLabel}
        </Badge>

        {manageMode ? (
          <div
            className="flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={category.enabled}
              onCheckedChange={(next) => onToggleEnabled?.(category, next)}
            />
            <button
              type="button"
              onClick={() => onEdit?.(category)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
          </div>
        ) : (
          <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
      </div>
      {showStatusProgress && category.statusCounts && category.demandCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {STATUS_ORDER.map((status) => (
              <span key={status} className="flex items-center gap-1">
                <span className={`size-2 rounded-full ${PROGRESS_BAR_COLORS[status]}`} />
                {status} {category.statusCounts?.[status] ?? 0}
              </span>
            ))}
          </div>
          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
            {STATUS_ORDER.map((status) => {
              const count = category.statusCounts?.[status] ?? 0;
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  className={PROGRESS_BAR_COLORS[status]}
                  style={{ width: `${(count / category.demandCount) * 100}%` }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryCard;
