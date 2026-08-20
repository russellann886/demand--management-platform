export const STATUS_ORDER = ['待处理', '跟进中', '已完成', '已关闭'] as const;

export const PROGRESS_BAR_COLORS: Record<string, string> = {
  '待处理': 'bg-muted-foreground/25',
  '跟进中': 'bg-primary',
  '已完成': 'bg-emerald-500',
  '已关闭': 'bg-muted-foreground/10',
};
