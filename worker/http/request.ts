import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', '请求体必须是合法 JSON');
  }
  if (!isObject(value)) {
    throw new ApiError(400, 'INVALID_BODY', '请求体必须是 JSON 对象');
  }
  return value;
}

export function pagination(context: Context): { page: number; pageSize: number } {
  return {
    page: positiveInteger(context.req.query('page'), 1, 10_000),
    pageSize: positiveInteger(context.req.query('pageSize'), 20, 100),
  };
}

export function requiredString(
  value: unknown,
  field: string,
  maxLength = 10_000,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw invalidField(field, '不能为空');
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw invalidField(field, `长度不能超过 ${maxLength}`);
  }
  return result;
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength = 10_000,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw invalidField(field, '必须是字符串');
  const result = value.trim();
  if (result.length > maxLength) throw invalidField(field, `长度不能超过 ${maxLength}`);
  return result || null;
}

export function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw invalidField(field, '必须是字符串数组');
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw invalidField(field, '必须是布尔值');
  return value;
}

export function optionalNumber(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidField(field, '必须是有限数字或 null');
  }
  return value;
}

export function enumValue<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw invalidField(field, `必须是以下值之一: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function optionalIsoDate(
  value: unknown,
  field: string,
): string | null | undefined {
  const parsed = optionalString(value, field, 100);
  if (parsed == null) return parsed;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) throw invalidField(field, '必须是合法日期');
  return date.toISOString();
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function invalidField(field: string, message: string): ApiError {
  return new ApiError(400, 'VALIDATION_ERROR', `${field}${message}`, {
    fieldErrors: { [field]: message },
  });
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) {
    throw new ApiError(400, 'INVALID_PAGINATION', '分页参数必须是正整数');
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > maximum) {
    throw new ApiError(400, 'INVALID_PAGINATION', `分页参数必须在 1 到 ${maximum} 之间`);
  }
  return parsed;
}
