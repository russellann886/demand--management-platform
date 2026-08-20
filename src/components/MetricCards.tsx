import { calculateStats } from '@/store/useDemandStore'
import type { DemandGroup } from '@/types/demand'

export default function MetricCards({ groups }: { groups: DemandGroup[] }) {
  const stats = calculateStats(groups)

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-border bg-background p-4 lg:grid-cols-4">
      <Metric label="最高关联" value={stats.maxRelation.toString()} />
      <Metric label="可展开组" value={stats.expandableCount.toString()} />
      <Metric label="跟进中" value={stats.activeCount > 0 ? '清晰' : '暂无'} tone="info" />
      <Metric label="待处理" value={stats.pendingCount > 0 ? '需确认' : '已清零'} tone="warning" />
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'info' | 'warning' }) {
  const toneClass = tone === 'info' ? 'status-info' : tone === 'warning' ? 'status-warning' : 'border-border bg-card'

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}
