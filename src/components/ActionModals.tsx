import { Sparkles, X } from 'lucide-react'
import FilterControls from '@/components/FilterControls'
import { availableRawDemands } from '@/data/demands'
import { useDemandStore } from '@/store/useDemandStore'

export default function ActionModals() {
  const { activeModal, groups, closeModal } = useDemandStore()
  const targetGroup = groups.find((group) => group.id === activeModal.groupId)

  if (!activeModal.type) return null

  if (activeModal.type === 'filters') {
    return (
      <div className="fixed inset-0 z-40 bg-black/30 xl:hidden" role="presentation" onClick={closeModal}>
        <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-card p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <ModalHeader title="筛选需求" />
          <FilterControls compact />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4" role="presentation" onClick={closeModal}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        {activeModal.type === 'delete' && targetGroup ? <DeleteDialog groupTitle={targetGroup.title} groupId={targetGroup.id} /> : null}
        {activeModal.type === 'add' && targetGroup ? <AddDemandDialog groupTitle={targetGroup.title} groupId={targetGroup.id} /> : null}
        {activeModal.type === 'manual' ? <ManualMergeDialog /> : null}
      </div>
    </div>
  )
}

function ModalHeader({ title }: { title: string }) {
  const { closeModal } = useDemandStore()

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus-visible-ring" aria-label="关闭弹窗" onClick={closeModal}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function DeleteDialog({ groupTitle, groupId }: { groupTitle: string; groupId: string }) {
  const { closeModal, deleteGroup } = useDemandStore()

  return (
    <>
      <ModalHeader title="确认删除整合组" />
      <p className="text-sm leading-6 text-muted-foreground">
        即将删除“{groupTitle}”。该操作为危险操作，确认后会从当前演示列表中移除该整合组。
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="h-9 rounded-md border border-border bg-card px-4 text-sm hover:bg-muted focus-visible-ring" onClick={closeModal}>
          取消
        </button>
        <button type="button" className="h-9 rounded-md border status-error-soft px-4 text-sm font-medium focus-visible-ring" onClick={() => deleteGroup(groupId)}>
          确认删除
        </button>
      </div>
    </>
  )
}

function AddDemandDialog({ groupTitle, groupId }: { groupTitle: string; groupId: string }) {
  const { addRawDemand } = useDemandStore()

  return (
    <>
      <ModalHeader title="添加原始需求" />
      <p className="mb-3 text-sm text-muted-foreground">选择一条模拟原始需求加入“{groupTitle}”。</p>
      <div className="grid gap-2">
        {availableRawDemands.map((rawDemand) => (
          <button
            type="button"
            key={rawDemand.id}
            className="rounded-md border border-border bg-background px-3 py-3 text-left text-sm hover:bg-muted focus-visible-ring"
            onClick={() => addRawDemand(groupId, rawDemand.id)}
          >
            <div className="font-medium">{rawDemand.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {rawDemand.owner} · {rawDemand.status} · {rawDemand.hasImage ? '含示意图' : '无示意图'}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function ManualMergeDialog() {
  const { runManualMerge } = useDemandStore()

  return (
    <>
      <ModalHeader title="手动整合" />
      <div className="rounded-md border border-border bg-background p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          建议整合项
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--demand-primary)]" />
            跨会场优惠聚合 + 搜索会场补充优惠角标
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--demand-primary)]" />
            库存预警口径 + 商详库存预警文案统一
          </label>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible-ring" onClick={runManualMerge}>
          完成整合
        </button>
      </div>
    </>
  )
}
