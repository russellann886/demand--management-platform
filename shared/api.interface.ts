/* 前后端共享的类型写在这里 */

// ==================== 需求栏目 DemandCategory ====================

export interface BoardSection {
  name: string;
  icon: string;
  description: string;
}

export const BOARD_SECTIONS: BoardSection[] = [
  { name: '消费券&货品板块', icon: 'Package', description: '消费券与货品规则相关需求' },
  { name: '追补板块', icon: 'RefreshCw', description: '追补相关需求' },
  { name: '内容场板块', icon: 'LayoutGrid', description: '内容运营与展示相关需求' },
  { name: '货架场板块', icon: 'Store', description: '货架场相关需求' },
  { name: '大促运营工具包板块', icon: 'Rocket', description: '大促活动运营工具需求' },
];

export const SECTION_ADMIN_ROLES: Record<string, string> = {
  admin_goods: '消费券&货品板块',
  admin_coupon: '消费券&货品板块',
  admin_replenish: '追补板块',
  admin_content: '内容场板块',
  admin_shelf: '货架场板块',
  admin_campaign: '大促运营工具包板块',
};

export const ALL_ADMIN_ROLES = [
  'demand_admin',
  ...Object.keys(SECTION_ADMIN_ROLES),
];

export type BoardAdmins = Record<string, string[]>;

export type FormFieldType = 'text' | 'textarea' | 'date' | 'link' | 'image' | 'select';

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

export type CustomFieldValue = string | FileAttachment | null;
export type CustomFields = Record<string, CustomFieldValue> | null;

export interface DemandCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  departments: string[];
  section: string | null;
  formFields: FormFieldDefinition[] | null;
  demandCount: number;
  statusCounts?: Record<string, number>;
  createdAt: string;
}

export interface DemandCategoryListResponse {
  items: DemandCategory[];
}

export interface CreateDemandCategoryRequest {
  name: string;
  description: string;
  departments?: string[];
  section?: string;
  formFields?: FormFieldDefinition[] | null;
}

export interface UpdateDemandCategoryRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  departments?: string[];
  section?: string;
  formFields?: FormFieldDefinition[] | null;
}

export interface DemandCategoryMutationResponse {
  id: string;
}

// ==================== 需求 Demand ====================

export interface FileAttachment {
  bucketId: string;
  filePath: string;
}

// 预期价值类型
export type DemandValueType = 'gmv' | 'efficiency';

// 需求扩展字段（提交、详情、整合来源共用）
export interface DemandExtraFields {
  valueType: DemandValueType | null;
  gmvLevel: string | null;
  efficiencyAffected: string | null;
  efficiencySavedMinutes: string | null;
  expectedOnlineTime: string | null;
  demandType: string | null;
  isBlocking: boolean | null;
  priority: string | null;
}

export interface DemandListItem {
  id: string;
  title: string;
  creator: string;
  submitterName: string | null;
  department: string;
  image: FileAttachment | null;
  createdAt: string;
}

export interface DemandListResponse {
  items: DemandListItem[];
  total: number;
}

export interface MyDemandItem {
  id: string;
  title: string;
  department: string;
  categoryId: string;
  section: string | null;
  status: string;
  createdAt: string;
}

export interface MyDemandListResponse {
  items: MyDemandItem[];
}

export interface DemandDetail extends DemandExtraFields {
  id: string;
  title: string;
  background: string;
  department: string;
  creator: string;
  submitterName: string | null;
  assignee: string | null;
  image: FileAttachment | null;
  createdAt: string;
  plannedSchedule: string | null;
  section: string | null;
  customFields: CustomFields;
  formFields: FormFieldDefinition[] | null;
}

export interface CreateDemandRequest extends DemandExtraFields {
  categoryId: string;
  title: string;
  background: string;
  department: string;
  image: FileAttachment | null;
  customFields?: CustomFields;
}

export interface CreateDemandResponse {
  id: string;
}

// 外部系统提交需求（/openapi/demands），提交人为姓名文本、无图片
export interface CreateDemandOpenApiRequest extends Partial<DemandExtraFields> {
  categoryId: string;
  title: string;
  background: string;
  department?: string;
  submitterName?: string;
}

// ==================== 评论 Comment ====================

export interface DemandCommentItem {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface DemandCommentListResponse {
  items: DemandCommentItem[];
  total: number;
}

export interface CreateCommentRequest {
  content: string;
}

export interface CreateCommentResponse {
  id: string;
}

// ==================== 需求整合 MergedDemand ====================

// 用于 AI 整合分析的原始需求条目
export interface SourceDemandItem extends DemandExtraFields {
  id: string;
  title: string;
  background: string;
  department: string;
  creator: string;
  submitterName: string | null;
  image: FileAttachment | null;
  createdAt: string;
  status: string;
  assignee: string | null;
  followUpFeedback: string | null;
  manualScore: number | null;
  plannedSchedule: string | null;
  customFields: CustomFields;
}

export interface SourceDemandListResponse {
  items: SourceDemandItem[];
}

// 整合需求关联的原始需求（含标题快照）
export interface MergedDemandSourceItem {
  demandId: string;
  title: string;
}

export interface MergedDemand {
  id: string;
  title: string;
  reason: string;
  status: string;
  assignee: string | null;
  followUpFeedback: string | null;
  sources: MergedDemandSourceItem[];
  createdAt: string;
  updatedAt: string;
  manualScore: number | null;
  plannedSchedule: string | null;
}

export interface MergedDemandListResponse {
  items: MergedDemand[];
}

export interface CreateMergedDemandRequest {
  categoryId: string;
  title: string;
  reason: string;
  demandIds: string[];
}

export interface UpdateMergedDemandRequest {
  title?: string;
  reason?: string;
  status?: string;
  assignee?: string | null;
  followUpFeedback?: string | null;
  demandIds?: string[];
  manualScore?: number | null;
  plannedSchedule?: string | null;
}

export interface UpdateDemandStatusRequest {
  status: string;
  plannedSchedule?: string | null;
}

export interface UpdateDemandScoreRequest {
  manualScore: number | null;
}

export interface UpdateDemandAssigneeRequest {
  assignee: string | null;
}

export interface AddMergedSourcesRequest {
  demandIds: string[];
}

export interface MergedDemandMutationResponse {
  id: string;
}

export interface ReleaseSourceResponse {
  id: string;
  dissolved: boolean;
}

// 服务端校验后的 AI 整合建议
export interface MergeSuggestion {
  title: string;
  reason: string;
  demandIds: string[];
}

export interface MergeSuggestionsRequest {
  categoryId: string;
}

export interface MergeSuggestionsResponse {
  suggestions: MergeSuggestion[];
}

// ==================== 规则广场 Rule ====================

export interface RuleSectionDef {
  key: string;
  name: string;
  adminRole: string;
  icon: string;
  description: string;
}

export const RULE_SECTIONS: RuleSectionDef[] = [
  { key: 'coupon', name: '营销优惠规则', adminRole: 'admin_coupon', icon: 'Ticket', description: '营销优惠相关规则与商品加白加黑申请' },
  { key: 'goods', name: '货品规则', adminRole: 'admin_goods', icon: 'Package', description: '货品相关规则与商品加白加黑申请' },
  { key: 'replenish', name: '加白规则', adminRole: 'admin_replenish', icon: 'RefreshCw', description: '加白相关规则与商品加白加黑申请' },
];

export type RuleType = '规则' | '加白' | '加黑';
export type RuleStatus = '待审批' | '已通过' | '已驳回';

export interface RuleListItem {
  id: string;
  name: string;
  type: RuleType;
  section: string;
  content: string;
  reason: string | null;
  file: FileAttachment | null;
  effectiveTime: string | null;
  scope: string | null;
  status: RuleStatus;
  creator: string;
  reviewer: string | null;
  reviewFeedback: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface RuleListResponse {
  items: RuleListItem[];
  total: number;
}

export interface Rule extends RuleListItem {}

export interface CreateRuleRequest {
  name: string;
  type: RuleType;
  section: string;
  content: string;
  reason?: string;
  file?: FileAttachment | null;
  effectiveTime?: string | null;
  scope?: string;
}

export interface UpdateRuleRequest {
  name?: string;
  content?: string;
  file?: FileAttachment | null;
  effectiveTime?: string | null;
  scope?: string;
}

export interface UpdateRuleStatusRequest {
  status: '已通过' | '已驳回';
  reviewFeedback?: string;
}
