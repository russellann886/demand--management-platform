import { create } from 'zustand'
import { availableRawDemands, initialDemandGroups } from '@/data/demands'
import type { ActiveModal, DemandFilters, DemandGroup, RelationRange, ToastState } from '@/types/demand'

interface DemandState {
  groups: DemandGroup[]
  filters: DemandFilters
  expandedIds: string[]
  activeModal: ActiveModal
  toast: ToastState | null
  isAiRunning: boolean
  theme: 'light' | 'dark'
  setFilter: (key: keyof DemandFilters, value: string) => void
  resetFilters: () => void
  toggleExpanded: (groupId: string) => void
  releaseRawDemand: (groupId: string, rawDemandId: string) => void
  deleteGroup: (groupId: string) => void
  addRawDemand: (groupId: string, rawDemandId: string) => void
  removeOwner: (groupId: string) => void
  runManualMerge: () => void
  runAiMerge: () => void
  openModal: (modal: ActiveModal) => void
  closeModal: () => void
  showToast: (toast: ToastState) => void
  clearToast: () => void
  toggleTheme: () => void
}

const defaultFilters: DemandFilters = {
  owner: '全部负责人',
  status: '全部状态',
  relationRange: '全部关联数',
}

const relationMatches = (range: RelationRange, count: number) => {
  if (range === '10 以上') return count >= 10
  if (range === '2-9') return count >= 2 && count <= 9
  if (range === '0') return count === 0
  return true
}

export const filterGroups = (groups: DemandGroup[], filters: DemandFilters) =>
  groups.filter((group) => {
    const ownerOk = filters.owner === '全部负责人' || group.owner === filters.owner
    const statusOk = filters.status === '全部状态' || group.status === filters.status
    const relationOk = relationMatches(filters.relationRange, group.relationCount)
    return ownerOk && statusOk && relationOk
  })

export const calculateStats = (groups: DemandGroup[]) => {
  const rawCount = groups.reduce((total, group) => total + group.relationCount, 0)
  const activeCount = groups.filter((group) => group.status === '跟进中').length
  const pendingCount = groups.filter((group) => group.status === '待处理').length
  const maxRelation = groups.reduce((max, group) => Math.max(max, group.relationCount), 0)
  const expandableCount = groups.filter((group) => group.rawDemands.length > 0).length

  return {
    groupCount: groups.length,
    rawCount,
    activeCount,
    pendingCount,
    maxRelation,
    expandableCount,
  }
}

export const useDemandStore = create<DemandState>((set, get) => ({
  groups: initialDemandGroups,
  filters: defaultFilters,
  expandedIds: ['g-1'],
  activeModal: { type: null },
  toast: null,
  isAiRunning: false,
  theme: 'light',
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
  toggleExpanded: (groupId) =>
    set((state) => ({
      expandedIds: state.expandedIds.includes(groupId)
        ? state.expandedIds.filter((id) => id !== groupId)
        : [...state.expandedIds, groupId],
    })),
  releaseRawDemand: (groupId, rawDemandId) =>
    set((state) => ({
      groups: state.groups.map((group) => {
        if (group.id !== groupId) return group
        const nextRawDemands = group.rawDemands.filter((item) => item.id !== rawDemandId)
        return {
          ...group,
          rawDemands: nextRawDemands,
          relationCount: Math.max(0, group.relationCount - 1),
        }
      }),
      toast: { message: '已释放关联原始需求', tone: 'success' },
    })),
  deleteGroup: (groupId) =>
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== groupId),
      expandedIds: state.expandedIds.filter((id) => id !== groupId),
      activeModal: { type: null },
      toast: { message: '整合组已删除', tone: 'success' },
    })),
  addRawDemand: (groupId, rawDemandId) =>
    set((state) => ({
      groups: state.groups.map((group) => {
        if (group.id !== groupId) return group
        const rawDemand = availableRawDemands.find((item) => item.id === rawDemandId)
        if (!rawDemand || group.rawDemands.some((item) => item.id === rawDemandId)) return group
        return {
          ...group,
          rawDemands: [...group.rawDemands, { ...rawDemand, id: `${rawDemand.id}-${group.id}` }],
          relationCount: group.relationCount + 1,
          hasImage: group.hasImage || rawDemand.hasImage,
        }
      }),
      expandedIds: Array.from(new Set([...state.expandedIds, groupId])),
      activeModal: { type: null },
      toast: { message: '已添加一条原始需求', tone: 'success' },
    })),
  removeOwner: (groupId) =>
    set((state) => ({
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, owner: '待分配' } : group)),
      toast: { message: '已移除当前负责人', tone: 'info' },
    })),
  runManualMerge: () =>
    set({
      activeModal: { type: null },
      toast: { message: '已完成手动整合演示，当前数据已保持同步', tone: 'success' },
    }),
  runAiMerge: () => {
    if (get().isAiRunning) return
    set({ isAiRunning: true, toast: { message: 'AI 正在识别可合并需求...', tone: 'info' } })
    window.setTimeout(() => {
      set((state) => ({
        isAiRunning: false,
        groups: state.groups.map((group) =>
          group.id === 'g-9'
            ? { ...group, relationCount: Math.max(group.relationCount, 1), status: '跟进中' }
            : group,
        ),
        toast: { message: 'AI 已推荐 3 组可合并需求，待归类入口已更新', tone: 'success' },
      }))
    }, 900)
  },
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: { type: null } }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', nextTheme === 'dark')
      document.documentElement.dataset.theme = nextTheme
      return { theme: nextTheme }
    }),
}))
