import { ShieldAlert } from 'lucide-react'
import FilterControls from '@/components/FilterControls'
import { useDemandStore } from '@/store/useDemandStore'
import { calculateStats, filterGroups } from '@/store/useDemandStore'

export default function Sidebar() {
  const { groups, filters, resetFilters } = useDemandStore()
  const stats = calculateStats(filterGroups(groups, filters))

  return (
    <aside className="hidden min-h-0 flex-col gap-4 xl:flex">
      <section className="rounded-md border border-border bg-card p-4" aria-labelledby="overview-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="overview-title" className="text-base font-semibold">
            概览
          </h2>
          <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">默认栏目</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="整合组数" value={stats.groupCount} />
          <StatCard label="原始需求" value={stats.rawCount} />
          <StatCard label="跟进中" value={stats.activeCount} tone="info" />
          <StatCard label="待处理" value={stats.pendingCount} tone="warning" />
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-4" aria-labelledby="filter-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="filter-title" className="text-base font-semibold">
            筛选
          </h2>
          <button type="button" className="rounded-md px-2 py-1 text-xs text-primary hover:bg-muted focus-visible-ring" onClick={resetFilters}>
            重置
          </button>
        </div>
        <FilterControls />
      </section>

      <section className="rounded-md border border-border bg-card p-4" aria-labelledby="hint-title">
        <div className="mb-2 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="hint-title" className="text-base font-semibold">
            安全提示
          </h2>
        </div>
        <div aria-live="polite" className="rounded-md border status-error-soft p-3 text-sm leading-6">
          删除为危险操作。Demo 中仅展示确认提示，需二次确认后才会继续。
        </div>
      </section>
    </aside>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'info' | 'warning' }) {
  const toneClass = tone === 'info' ? 'status-info' : tone === 'warning' ? 'status-warning' : 'border-border neutral-tint'

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
