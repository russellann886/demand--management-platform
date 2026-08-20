import { hasRole } from '../auth/permissions';
import type { AuthUser } from '../auth/types';
import {
  createId,
  deserializeNullableAttachment,
  serializeNullableAttachment,
  toDbTimestamp,
} from '../db/serialization';
import type { RuleRow, WorkerBindings } from '../db/types';
import {
  ApiError,
  enumValue,
  optionalIsoDate,
  optionalString,
  requiredString,
} from '../http/request';
import { getRule } from '../repositories/rules';
import {
  REVIEW_STATUSES,
  RULE_SECTION_ROLES,
  RULE_STATUSES,
  RULE_TYPES,
  parseAttachment,
  parseRuleType,
} from './contracts';

export async function listRules(
  env: WorkerBindings,
  user: AuthUser,
  query: {
    section?: string;
    type?: string;
    status?: string;
    creator?: string;
    page: number;
    pageSize: number;
  },
) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (query.section) {
    assertRuleSection(query.section);
    conditions.push('section = ?');
    values.push(query.section);
  }
  if (query.type) {
    conditions.push('type = ?');
    values.push(enumValue(query.type, 'type', RULE_TYPES));
  }
  if (query.status) {
    conditions.push('status = ?');
    values.push(enumValue(query.status, 'status', RULE_STATUSES));
  }
  if (query.creator === 'me') {
    conditions.push('creator = ?');
    values.push(user.id);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows, total] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM rule ${where}
       ORDER BY _created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...values, query.pageSize, (query.page - 1) * query.pageSize)
      .all<RuleRow>(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM rule ${where}`)
      .bind(...values)
      .first<{ total: number }>(),
  ]);
  return {
    items: rows.results.map(toRule),
    total: Number(total?.total ?? 0),
  };
}

export async function ruleDetail(env: WorkerBindings, id: string) {
  const rule = await getRule(env.DB, id);
  if (!rule) throw new ApiError(404, 'RULE_NOT_FOUND', '规则不存在');
  return toRule(rule);
}

export async function createRule(
  env: WorkerBindings,
  user: AuthUser,
  body: Record<string, unknown>,
) {
  const type = parseRuleType(body.type);
  const section = requiredString(body.section, 'section', 50);
  assertRuleSection(section);
  if (type === '规则') assertRuleAccess(user, section, '无权创建规则');
  const id = createId();
  const now = toDbTimestamp();
  const file = body.file === undefined ? null : parseAttachment(body.file, 'file');
  await env.DB.prepare(
    `INSERT INTO rule
      (id, name, type, content, reason, effective_time, scope, status,
       creator, section, file, _created_at, _created_by, _updated_at, _updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      requiredString(body.name, 'name', 500),
      type,
      requiredString(body.content, 'content', 100_000),
      optionalString(body.reason, 'reason', 100_000) ?? null,
      optionalIsoDate(body.effectiveTime, 'effectiveTime') ?? null,
      optionalString(body.scope, 'scope', 10_000) ?? null,
      type === '规则' ? '已通过' : '待审批',
      user.id,
      section,
      serializeNullableAttachment(file),
      now,
      user.id,
      now,
      user.id,
    )
    .run();
  return { id };
}

export async function updateRule(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  const rule = await assertManageableRule(env, user, id, 'rule');
  const updates = ['_updated_at = ?', '_updated_by = ?'];
  const values: unknown[] = [toDbTimestamp(), user.id];
  addUpdate(updates, values, 'name', body.name, (value) =>
    requiredString(value, 'name', 500),
  );
  addUpdate(updates, values, 'content', body.content, (value) =>
    requiredString(value, 'content', 100_000),
  );
  addUpdate(updates, values, 'file', body.file, (value) =>
    serializeNullableAttachment(parseAttachment(value, 'file')),
  );
  addUpdate(updates, values, 'effective_time', body.effectiveTime, (value) =>
    optionalIsoDate(value, 'effectiveTime') ?? null,
  );
  addUpdate(updates, values, 'scope', body.scope, (value) =>
    optionalString(value, 'scope', 10_000) ?? null,
  );
  await env.DB.prepare(`UPDATE rule SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values, rule.id)
    .run();
  return { id: rule.id };
}

export async function deleteRule(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
) {
  const rule = await assertManageableRule(env, user, id, 'rule');
  await env.DB.prepare('DELETE FROM rule WHERE id = ?').bind(rule.id).run();
  return { id: rule.id };
}

export async function reviewRule(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  const rule = await assertManageableRule(env, user, id, 'application');
  const status = enumValue(body.status, 'status', REVIEW_STATUSES);
  const now = toDbTimestamp();
  await env.DB.prepare(
    `UPDATE rule
     SET status = ?, reviewer = ?, review_feedback = ?, reviewed_at = ?,
         _updated_at = ?, _updated_by = ?
     WHERE id = ?`,
  )
    .bind(
      status,
      user.id,
      optionalString(body.reviewFeedback, 'reviewFeedback', 100_000) ?? null,
      now,
      now,
      user.id,
      rule.id,
    )
    .run();
  return { id: rule.id };
}

async function assertManageableRule(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  mode: 'rule' | 'application',
) {
  const rule = await getRule(env.DB, id);
  if (!rule) throw new ApiError(404, 'RULE_NOT_FOUND', '规则不存在');
  if (mode === 'rule' && rule.type !== '规则') {
    throw new ApiError(400, 'RULE_TYPE_MISMATCH', '仅规则类型可编辑');
  }
  if (mode === 'application') {
    if (rule.type === '规则') {
      throw new ApiError(400, 'RULE_TYPE_MISMATCH', '规则类型无需审批');
    }
    if (rule.status !== '待审批') {
      throw new ApiError(400, 'RULE_ALREADY_REVIEWED', '该规则已审批');
    }
  }
  assertRuleAccess(user, rule.section ?? '', '无权管理当前板块的规则');
  return rule;
}

function assertRuleAccess(user: AuthUser, section: string, message: string) {
  const requiredRole = RULE_SECTION_ROLES[section as keyof typeof RULE_SECTION_ROLES];
  if (
    !requiredRole ||
    !hasRole(user.roles, ['demand_admin', requiredRole])
  ) {
    throw new ApiError(403, 'SECTION_FORBIDDEN', message);
  }
}

function assertRuleSection(section: string) {
  if (!(section in RULE_SECTION_ROLES)) {
    throw new ApiError(400, 'INVALID_RULE_SECTION', '规则板块不存在');
  }
}

function toRule(row: RuleRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    section: row.section ?? '',
    content: row.content,
    reason: row.reason,
    file: deserializeNullableAttachment(row.file, 'file'),
    effectiveTime: row.effective_time,
    scope: row.scope,
    status: row.status,
    creator: row.creator ?? '',
    reviewer: row.reviewer,
    reviewFeedback: row.review_feedback,
    reviewedAt: row.reviewed_at,
    createdAt: row._created_at,
  };
}

function addUpdate(
  updates: string[],
  values: unknown[],
  column: string,
  value: unknown,
  transform: (value: unknown) => unknown,
) {
  if (value === undefined) return;
  updates.push(`${column} = ?`);
  values.push(transform(value));
}
