import type { DbBoolean, FileAttachment } from './types';

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export function createId(): string {
  return crypto.randomUUID();
}

export function toDbTimestamp(value: Date = new Date()): string {
  return value.toISOString();
}

export function toDbBoolean(value: boolean): DbBoolean {
  return value ? 1 : 0;
}

export function fromDbBoolean(value: DbBoolean): boolean {
  return value === 1;
}

export function serializeJson(value: JsonValue): string {
  return JSON.stringify(toStoredJson(value));
}

export function deserializeJson<T extends JsonValue>(
  value: string,
  validate: (parsed: JsonValue) => parsed is T,
  fieldName = 'JSON field',
): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new TypeError(`${fieldName} contains invalid JSON`);
  }

  if (!isJsonValue(parsed)) {
    throw new TypeError(`${fieldName} has an unexpected shape`);
  }

  const hydrated = fromStoredJson(parsed);
  if (!validate(hydrated)) {
    throw new TypeError(`${fieldName} has an unexpected shape`);
  }

  return hydrated;
}

export function serializeStringArray(value: readonly string[]): string {
  return serializeJson([...value]);
}

export function deserializeStringArray(
  value: string,
  fieldName = 'string array',
): string[] {
  return deserializeJson(
    value,
    (parsed): parsed is string[] =>
      Array.isArray(parsed) && parsed.every((item) => typeof item === 'string'),
    fieldName,
  );
}

export function serializeAttachment(value: FileAttachment): string {
  assertAttachment(value);
  return serializeJson(value);
}

export function deserializeAttachment(
  value: string,
  fieldName = 'attachment',
): FileAttachment {
  return deserializeJson(value, isAttachment, fieldName);
}

export function serializeNullableAttachment(
  value: FileAttachment | null | undefined,
): string | null {
  return value == null ? null : serializeAttachment(value);
}

export function deserializeNullableAttachment(
  value: string | null,
  fieldName = 'attachment',
): FileAttachment | null {
  return value === null ? null : deserializeAttachment(value, fieldName);
}

function assertAttachment(value: unknown): asserts value is FileAttachment {
  if (!isAttachment(value)) {
    throw new TypeError('attachment requires non-empty bucketId and filePath');
  }
}

function isAttachment(value: unknown): value is FileAttachment {
  return (
    isJsonObject(value) &&
    typeof value.bucketId === 'string' &&
    value.bucketId.length > 0 &&
    typeof value.filePath === 'string' &&
    value.filePath.length > 0
  );
}

function toStoredJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(toStoredJson);
  }
  if (!isJsonObject(value)) {
    return value;
  }
  if (isAttachment(value)) {
    return { fileKey: value.filePath };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toStoredJson(item)]),
  );
}

function fromStoredJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(fromStoredJson);
  }
  if (!isJsonObject(value)) {
    return value;
  }
  if (
    Object.keys(value).length === 1 &&
    typeof value.fileKey === 'string' &&
    value.fileKey.length > 0
  ) {
    return { bucketId: 'kv', filePath: value.fileKey };
  }
  if (
    Object.keys(value).length === 1 &&
    typeof value.r2Key === 'string' &&
    value.r2Key.length > 0
  ) {
    return { bucketId: 'kv', filePath: value.r2Key };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, fromStoredJson(item)]),
  );
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonObject(value) && Object.values(value).every(isJsonValue);
}

function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
