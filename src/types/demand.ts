export type DemandStatus = '跟进中' | '待处理'

export type RelationRange = '全部关联数' | '10 以上' | '2-9' | '0'

export interface RawDemand {
  id: string
  title: string
  owner: string
  status: DemandStatus
  hasImage: boolean
}

export interface DemandGroup {
  id: string
  title: string
  summary: string
  status: DemandStatus
  owner: string
  hasImage: boolean
  relationCount: number
  rawDemands: RawDemand[]
}

export interface DemandFilters {
  owner: string
  status: string
  relationRange: RelationRange
}

export type ModalType = 'delete' | 'add' | 'manual' | 'filters' | null

export interface ActiveModal {
  type: ModalType
  groupId?: string
}

export interface ToastState {
  message: string
  tone: 'info' | 'success' | 'warning' | 'error'
}
