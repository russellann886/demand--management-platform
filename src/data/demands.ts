import type { DemandGroup, RawDemand } from '@/types/demand'

export const owners = ['全部负责人', '赵博安', '刘洋', '张伟', '孙强', '赵丽', '李明']
export const statuses = ['全部状态', '跟进中', '待处理']
export const relationRanges = ['全部关联数', '10 以上', '2-9', '0'] as const

export const availableRawDemands: RawDemand[] = [
  { id: 'raw-a1', title: '搜索会场补充优惠角标', owner: '刘洋', status: '跟进中', hasImage: true },
  { id: 'raw-a2', title: '直播间利益点统一露出', owner: '孙强', status: '待处理', hasImage: true },
  { id: 'raw-a3', title: '订单页权益说明补充', owner: '赵丽', status: '跟进中', hasImage: false },
  { id: 'raw-a4', title: '商详库存预警文案统一', owner: '张伟', status: '待处理', hasImage: false },
]

export const initialDemandGroups: DemandGroup[] = [
  {
    id: 'g-1',
    title: '跨会场优惠聚合',
    summary: '同类促销、券包与会场入口合并维护',
    status: '跟进中',
    owner: '赵博安',
    hasImage: true,
    relationCount: 14,
    rawDemands: [
      { id: 'raw-1-1', title: '优惠券跨店展示统一入口', owner: '刘洋', status: '跟进中', hasImage: true },
      { id: 'raw-1-2', title: '大促会场券包合并规则', owner: '张伟', status: '待处理', hasImage: false },
    ],
  },
  {
    id: 'g-2',
    title: '商品氛围标签',
    summary: '主图、商详与搜索结果页标签统一',
    status: '跟进中',
    owner: '刘洋',
    hasImage: true,
    relationCount: 10,
    rawDemands: [
      { id: 'raw-2-1', title: '主图促销氛围角标补齐', owner: '刘洋', status: '跟进中', hasImage: true },
      { id: 'raw-2-2', title: '搜索结果页权益标签统一', owner: '赵博安', status: '跟进中', hasImage: false },
    ],
  },
  {
    id: 'g-3',
    title: '库存预警口径',
    summary: '售罄、低库存与补货提醒口径收敛',
    status: '待处理',
    owner: '张伟',
    hasImage: false,
    relationCount: 6,
    rawDemands: [
      { id: 'raw-3-1', title: '低库存阈值提醒规则', owner: '张伟', status: '待处理', hasImage: false },
    ],
  },
  {
    id: 'g-4',
    title: '达人报名同步',
    summary: '报名信息、审核状态与站内通知联动',
    status: '跟进中',
    owner: '孙强',
    hasImage: true,
    relationCount: 5,
    rawDemands: [
      { id: 'raw-4-1', title: '达人审核状态同步到活动页', owner: '孙强', status: '跟进中', hasImage: true },
    ],
  },
  {
    id: 'g-5',
    title: '价格保护说明',
    summary: '用户侧价格保护入口与说明文案统一',
    status: '待处理',
    owner: '赵丽',
    hasImage: false,
    relationCount: 4,
    rawDemands: [
      { id: 'raw-5-1', title: '价保入口在订单详情页露出', owner: '赵丽', status: '待处理', hasImage: false },
    ],
  },
  {
    id: 'g-6',
    title: '客服兜底话术',
    summary: '异常订单、券失败与退补流程解释',
    status: '跟进中',
    owner: '李明',
    hasImage: false,
    relationCount: 3,
    rawDemands: [
      { id: 'raw-6-1', title: '券失败客服解释模板', owner: '李明', status: '跟进中', hasImage: false },
    ],
  },
  {
    id: 'g-7',
    title: '榜单露出策略',
    summary: '热销榜、新品榜与权益榜合并策略',
    status: '跟进中',
    owner: '赵博安',
    hasImage: true,
    relationCount: 2,
    rawDemands: [
      { id: 'raw-7-1', title: '权益榜排序口径统一', owner: '赵博安', status: '跟进中', hasImage: true },
    ],
  },
  {
    id: 'g-8',
    title: '支付分期提示',
    summary: '支付页、确认页与订单页提示一致',
    status: '待处理',
    owner: '刘洋',
    hasImage: false,
    relationCount: 2,
    rawDemands: [
      { id: 'raw-8-1', title: '确认页分期文案补齐', owner: '刘洋', status: '待处理', hasImage: false },
    ],
  },
  {
    id: 'g-9',
    title: '待归类入口',
    summary: '暂无关联，等待手动添加或 AI 识别',
    status: '待处理',
    owner: '张伟',
    hasImage: false,
    relationCount: 0,
    rawDemands: [],
  },
  {
    id: 'g-10',
    title: '待清洗描述',
    summary: '需求描述不足，需补充目标范围',
    status: '待处理',
    owner: '孙强',
    hasImage: false,
    relationCount: 0,
    rawDemands: [],
  },
  {
    id: 'g-11',
    title: '空组保留',
    summary: '保留业务元素，便于后续合并操作',
    status: '跟进中',
    owner: '赵丽',
    hasImage: false,
    relationCount: 0,
    rawDemands: [],
  },
]
