import { owners, relationRanges, statuses } from '@/data/demands'
import { useDemandStore } from '@/store/useDemandStore'
import type { DemandFilters } from '@/types/demand'

export default function FilterControls({ compact = false }: { compact?: boolean }) {
  const { filters, setFilter, resetFilters } = useDemandStore()

  const fieldClass = compact ? 'grid gap-1.5' : 'flex flex-col gap-1.5'

  return (
    <form className={compact ? 'grid gap-3 sm:grid-cols-3' : 'flex flex-col gap-3'}>
      <div className={fieldClass}>
        <label htmlFor={compact ? 'owner-filter-mobile' : 'owner-filter'} className="text-xs font-medium text-muted-foreground">
          负责人
        </label>
        <select
          id={compact ? 'owner-filter-mobile' : 'owner-filter'}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible-ring"
          value={filters.owner}
          onChange={(event) => setFilter('owner', event.target.value)}
        >
          {owners.map((owner) => (
            <option key={owner}>{owner}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor={compact ? 'status-filter-mobile' : 'status-filter'} className="text-xs font-medium text-muted-foreground">
          状态
        </label>
        <select
          id={compact ? 'status-filter-mobile' : 'status-filter'}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible-ring"
          value={filters.status}
          onChange={(event) => setFilter('status', event.target.value)}
        >
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor={compact ? 'relation-filter-mobile' : 'relation-filter'} className="text-xs font-medium text-muted-foreground">
          关联数
        </label>
        <select
          id={compact ? 'relation-filter-mobile' : 'relation-filter'}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible-ring"
          value={filters.relationRange}
          onChange={(event) => setFilter('relationRange', event.target.value as DemandFilters['relationRange'])}
        >
          {relationRanges.map((range) => (
            <option key={range}>{range}</option>
          ))}
        </select>
      </div>
      {compact ? (
        <button
          type="button"
          className="h-10 rounded-md border border-border bg-muted px-3 text-sm text-foreground hover:bg-background focus-visible-ring sm:col-span-3"
          onClick={resetFilters}
        >
          重置筛选
        </button>
      ) : null}
    </form>
  )
}
