import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemandStore } from '@/store/useDemandStore'
import type { DemandGroup, DemandStatus, RawDemand } from '@/types/demand'

export default function DemandList({ groups }: { groups: DemandGroup[] }) {
  const { resetFilters } = useDemandStore()

  if (groups.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-1 items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <div className="text-base font-semibold">没有符合条件的整合需求</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">请调整负责人、状态或关联数筛选条件，或一键重置查看全部需求。</p>
          <button type="button" className="mt-4 h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible-ring" onClick={resetFilters}>
            重置筛选
          </button>
        </div>
      </div>
    )
  }

  return (
    <div data-scroll-region="primary" className="workbench-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="demand-row-grid hidden items-center gap-3 border-b border-border bg-muted px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
        <div className="text-right">关联数</div>
        <div>整合需求</div>
        <div>状态</div>
        <div>负责人</div>
        <div>素材</div>
        <div className="text-right">操作</div>
      </div>
      <div className="md:hidden">
        {groups.map((group) => (
          <MobileDemandCard key={group.id} group={group} />
        ))}
      </div>
      <div className="hidden md:block">
        {groups.map((group) => (
          <DesktopDemandRow key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}

function DesktopDemandRow({ group }: { group: DemandGroup }) {
  const { expandedIds, toggleExpanded, openModal, removeOwner } = useDemandStore()
  const expanded = expandedIds.includes(group.id)

  return (
    <article className={cn('border-b border-border', group.relationCount === 0 && 'bg-background/60')}>
      <div className="demand-row-grid grid items-center gap-3 px-4 py-3">
        <div className={cn('text-right text-xl font-semibold', group.relationCount === 0 && 'text-muted-foreground')}>{group.relationCount}</div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{group.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{group.summary}</p>
        </div>
        <StatusBadge status={group.status} />
        <OwnerBadge owner={group.owner} active={group.owner === '赵博安'} />
        <AssetBadge hasImage={group.hasImage} />
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" className={cn('rounded-md border px-2 py-1.5 text-xs focus-visible-ring', expanded ? 'border-border bg-muted' : 'border-border bg-card hover:bg-muted')} onClick={() => toggleExpanded(group.id)}>
            {expanded ? '收起' : '展开'}
          </button>
          <button type="button" className="rounded-md border border-primary bg-card px-2 py-1.5 text-xs text-primary hover:bg-muted focus-visible-ring" onClick={() => openModal({ type: 'add', groupId: group.id })}>
            添加需求
          </button>
          {group.owner === '赵博安' ? (
            <button type="button" className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted focus-visible-ring" onClick={() => removeOwner(group.id)}>
              移除 赵博安
            </button>
          ) : (
            <button type="button" className="rounded-md border status-error-soft px-2 py-1.5 text-xs focus-visible-ring" onClick={() => openModal({ type: 'delete', groupId: group.id })}>
              删除
            </button>
          )}
        </div>
      </div>
      {expanded ? <RawDemandPanel group={group} /> : null}
    </article>
  )
}

function MobileDemandCard({ group }: { group: DemandGroup }) {
  const { expandedIds, toggleExpanded, openModal, removeOwner } = useDemandStore()
  const expanded = expandedIds.includes(group.id)

  return (
    <article className="m-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">{group.relationCount}</span>
            <StatusBadge status={group.status} />
          </div>
          <h3 className="mt-2 text-sm font-semibold">{group.title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.summary}</p>
        </div>
        <AssetBadge hasImage={group.hasImage} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <OwnerBadge owner={group.owner} active={group.owner === '赵博安'} />
        <button type="button" className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs hover:bg-muted focus-visible-ring" onClick={() => toggleExpanded(group.id)}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? '收起' : '展开'}
        </button>
        <button type="button" className="h-10 rounded-md border border-primary bg-card px-3 text-xs text-primary focus-visible-ring" onClick={() => openModal({ type: 'add', groupId: group.id })}>
          添加需求
        </button>
        {group.owner === '赵博安' ? (
          <button type="button" className="h-10 rounded-md border border-border px-3 text-xs text-muted-foreground focus-visible-ring" onClick={() => removeOwner(group.id)}>
            移除负责人
          </button>
        ) : (
          <button type="button" className="h-10 rounded-md border status-error-soft px-3 text-xs focus-visible-ring" onClick={() => openModal({ type: 'delete', groupId: group.id })}>
            删除
          </button>
        )}
      </div>
      {expanded ? <RawDemandPanel group={group} mobile /> : null}
    </article>
  )
}

function RawDemandPanel({ group, mobile = false }: { group: DemandGroup; mobile?: boolean }) {
  const { releaseRawDemand } = useDemandStore()

  return (
    <div className={cn('rounded-md border border-border bg-background p-3', mobile ? 'mt-3' : 'mx-4 mb-3')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">关联的原始需求（{group.rawDemands.length}）</h4>
        <span className="text-xs text-muted-foreground">释放后回到原始池</span>
      </div>
      {group.rawDemands.length > 0 ? (
        <div className="grid gap-2">
          {group.rawDemands.map((rawDemand) => (
            <RawDemandItem key={rawDemand.id} groupId={group.id} rawDemand={rawDemand} onRelease={releaseRawDemand} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-card px-3 py-4 text-sm text-muted-foreground">暂无关联原始需求，可点击“添加需求”补充。</div>
      )}
    </div>
  )
}

function RawDemandItem({ groupId, rawDemand, onRelease }: { groupId: string; rawDemand: RawDemand; onRelease: (groupId: string, rawDemandId: string) => void }) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-card px-3 py-2 sm:grid-cols-[minmax(0,1fr)_120px_86px] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm">{rawDemand.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {rawDemand.owner} · {rawDemand.hasImage ? '含示意图' : '无示意图'}
        </div>
      </div>
      <StatusBadge status={rawDemand.status} center />
      <button type="button" className="rounded-md border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted focus-visible-ring" onClick={() => onRelease(groupId, rawDemand.id)}>
        释放
      </button>
    </div>
  )
}

function StatusBadge({ status, center = false }: { status: DemandStatus; center?: boolean }) {
  return (
    <span className={cn('w-fit rounded-md border px-2 py-1 text-xs font-medium', center && 'text-center', status === '跟进中' ? 'status-info' : 'status-warning')}>
      {status}
    </span>
  )
}

function OwnerBadge({ owner, active }: { owner: string; active: boolean }) {
  const firstName = owner.slice(0, 1)

  return (
    <span className="flex w-fit items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-xs">
      <span className={cn('flex h-5 w-5 items-center justify-center rounded border border-border text-[11px] font-semibold', active ? 'primary-tint text-primary' : 'neutral-tint')}>
        {firstName}
      </span>
      {owner}
    </span>
  )
}

function AssetBadge({ hasImage }: { hasImage: boolean }) {
  return (
    <span className={cn('w-fit rounded-md border border-border px-2 py-1 text-xs text-muted-foreground', hasImage ? 'bg-muted' : 'bg-card')}>
      {hasImage ? '含示意图' : '无示意图'}
    </span>
  )
}
