import { ApiError, enumValue, isObject, optionalString, requiredString } from '../http/request';

export const DEMAND_STATUSES = ['待处理', '跟进中', '已完成', '已关闭'] as const;
export const RULE_TYPES = ['规则', '加白', '加黑'] as const;
export const RULE_STATUSES = ['待审批', '已通过', '已驳回'] as const;
export const REVIEW_STATUSES = ['已通过', '已驳回'] as const;
export const RULE_SECTION_ROLES = {
  coupon: 'admin_coupon',
  goods: 'admin_goods',
  replenish: 'admin_replenish',
} as const;

export type DemandStatus = (typeof DEMAND_STATUSES)[number];
export type RuleType = (typeof RULE_TYPES)[number];
export type RuleStatus = (typeof RULE_STATUSES)[number];

export type FormField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'link' | 'image' | 'select';
  required: boolean;
  options?: string[];
};

export function parseDemandStatus(value: unknown): DemandStatus {
  return enumValue(value, 'status', DEMAND_STATUSES);
}

export function parseRuleType(value: unknown): RuleType {
  return enumValue(value, 'type', RULE_TYPES);
}

export function parseFormFields(value: unknown): FormField[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'formFields必须是数组或 null');
  }
  return value.map((item, index) => {
    if (!isObject(item)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `formFields[${index}]格式错误`);
    }
    const type = enumValue(item.type, `formFields[${index}].type`, [
      'text',
      'textarea',
      'date',
      'link',
      'image',
      'select',
    ] as const);
    if (typeof item.required !== 'boolean') {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `formFields[${index}].required必须是布尔值`,
      );
    }
    const options =
      item.options === undefined
        ? undefined
        : Array.isArray(item.options) &&
            item.options.every((option) => typeof option === 'string')
          ? item.options.map((option) => option.trim()).filter(Boolean)
          : null;
    if (options === null) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `formFields[${index}].options必须是字符串数组`,
      );
    }
    return {
      id: requiredString(item.id, `formFields[${index}].id`, 100),
      label: requiredString(item.label, `formFields[${index}].label`, 100),
      type,
      required: item.required,
      ...(options === undefined ? {} : { options }),
    };
  });
}

export type Attachment = { bucketId: string; filePath: string };

export function parseAttachment(value: unknown, field: string): Attachment | null {
  if (value === null) return null;
  if (!isObject(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field}必须是附件对象或 null`);
  }
  return {
    bucketId: requiredString(value.bucketId, `${field}.bucketId`, 200),
    filePath: requiredString(value.filePath, `${field}.filePath`, 2_000),
  };
}

export function parseJsonObject(value: unknown, field: string): Record<string, unknown> | null {
  if (value === null) return null;
  if (!isObject(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field}必须是对象或 null`);
  }
  try {
    JSON.stringify(value);
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field}必须可序列化为 JSON`);
  }
  return value;
}

export function parseNullableUserId(value: unknown, field = 'assignee'): string | null {
  const parsed = optionalString(value, field, 200);
  if (parsed === undefined) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field}不能为空`);
  }
  return parsed;
}
