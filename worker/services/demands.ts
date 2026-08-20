import { canManageSection } from '../auth/permissions';
import type { AuthUser } from '../auth/types';
import {
  createId,
  deserializeNullableAttachment,
  serializeNullableAttachment,
  toDbBoolean,
  toDbTimestamp,
} from '../db/serialization';
import type { DemandRow, WorkerBindings } from '../db/types';
import {
  ApiError,
  enumValue,
  optionalBoolean,
  optionalIsoDate,
  optionalNumber,
  optionalString,
  requiredString,
} from '../http/request';
import { getDemand, getDemandCategory, getDemandWithSection } from '../repositories/demands';
import {
  parseAttachment,
  parseDemandStatus,
  parseJsonObject,
  parseNullableUserId,
} from './contracts';

type CreateOptions = { userId: string | null; external: boolean };

export async function listDemands(
  env: WorkerBindings,
  categoryId: string,
  page: number,
  pageSize: number,
) {
  if (!categoryId) throw new ApiError(400, 'CATEGORY_REQUIRED', 'categoryId不能为空');
  const offset = (page - 1) * pageSize;
  const [itemsResult, totalRow] = await Promise.all([
    env.DB.prepare(
      `SELECT id, title, creator, submitter_name, department, image, _created_at
       FROM demand WHERE category_id = ?
       ORDER BY _created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(categoryId, pageSize, offset)
      .all<Pick<
        DemandRow,
        'id' | 'title' | 'creator' | 'submitter_name' | 'department' | 'image' | '_created_at'
      >>(),
    env.DB.prepare('SELECT COUNT(*) AS total FROM demand WHERE category_id = ?')
      .bind(categoryId)
      .first<{ total: number }>(),
  ]);
  return {
    items: itemsResult.results.map((row) => ({
      id: row.id,
      title: row.title,
      creator: row.creator ?? '',
      submitterName: row.submitter_name,
      department: row.department,
      image: deserializeNullableAttachment(row.image, 'image'),
      createdAt: row._created_at,
    })),
    total: Number(totalRow?.total ?? 0),
  };
}

export async function listMyDemands(env: WorkerBindings, userId: string) {
  const result = await env.DB.prepare(
    `SELECT d.id, d.title, d.department, d.category_id, c.section,
            d.status, d._created_at
     FROM demand d
     LEFT JOIN demand_category c ON c.id = d.category_id
     WHERE d.creator = ?
     ORDER BY d._created_at DESC`,
  )
    .bind(userId)
    .all<{
      id: string;
      title: string;
      department: string;
      category_id: string;
      section: string | null;
      status: string;
      _created_at: string;
    }>();
  return {
    items: result.results.map((row) => ({
      id: row.id,
      title: row.title,
      department: row.department,
      categoryId: row.category_id,
      section: row.section,
      status: row.status,
      createdAt: row._created_at,
    })),
  };
}

export async function demandDetail(env: WorkerBindings, id: string) {
  const row = await getDemandWithSection(env.DB, id);
  if (!row) throw new ApiError(404, 'DEMAND_NOT_FOUND', '需求不存在');
  return toDemandDetail(row);
}

export async function createDemand(
  env: WorkerBindings,
  body: Record<string, unknown>,
  options: CreateOptions,
) {
  const categoryId = requiredString(body.categoryId, 'categoryId', 100);
  const category = await getDemandCategory(env.DB, categoryId);
  if (!category || (options.external && category.enabled !== 1)) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', '需求栏目不存在或已停用');
  }
  const id = createId();
  const now = toDbTimestamp();
  const attachment =
    options.external || body.image === undefined ? null : parseAttachment(body.image, 'image');
  const customFields =
    body.customFields === undefined ? null : parseJsonObject(body.customFields, 'customFields');
  const valueType =
    body.valueType == null
      ? null
      : enumValue(body.valueType, 'valueType', ['gmv', 'efficiency'] as const);
  const isBlocking =
    body.isBlocking == null ? null : toDbBoolean(optionalBoolean(body.isBlocking, 'isBlocking')!);
  await env.DB.prepare(
    `INSERT INTO demand
      (id, category_id, title, background, expected_value, gmv_level,
       efficiency_affected, efficiency_saved_minutes, department,
       expected_online_time, demand_type, is_blocking, priority, creator,
       submitter_name, image, custom_fields, _created_at, _created_by,
       _updated_at, _updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      categoryId,
      requiredString(body.title, 'title', 500),
      optionalString(body.background, 'background', 100_000) ?? '',
      valueType,
      optionalString(body.gmvLevel, 'gmvLevel', 200) ?? null,
      optionalString(body.efficiencyAffected, 'efficiencyAffected', 500) ?? null,
      optionalString(body.efficiencySavedMinutes, 'efficiencySavedMinutes', 200) ?? null,
      optionalString(body.department, 'department', 500) ?? '',
      optionalIsoDate(body.expectedOnlineTime, 'expectedOnlineTime') ?? null,
      optionalString(body.demandType, 'demandType', 200) ?? null,
      isBlocking,
      optionalString(body.priority, 'priority', 200) ?? null,
      options.userId,
      options.external ? optionalString(body.submitterName, 'submitterName', 200) ?? null : null,
      serializeNullableAttachment(attachment),
      customFields === null ? null : JSON.stringify(customFields),
      now,
      options.userId,
      now,
      options.userId,
    )
    .run();
  return { id };
}

export async function listComments(
  env: WorkerBindings,
  demandId: string,
  page: number,
  pageSize: number,
) {
  if (!(await getDemand(env.DB, demandId))) {
    throw new ApiError(404, 'DEMAND_NOT_FOUND', '需求不存在');
  }
  const [rows, total] = await Promise.all([
    env.DB.prepare(
      `SELECT id, user_id, content, _created_at
       FROM demand_comment WHERE demand_id = ?
       ORDER BY _created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(demandId, pageSize, (page - 1) * pageSize)
      .all<{ id: string; user_id: string; content: string; _created_at: string }>(),
    env.DB.prepare('SELECT COUNT(*) AS total FROM demand_comment WHERE demand_id = ?')
      .bind(demandId)
      .first<{ total: number }>(),
  ]);
  return {
    items: rows.results.map((row) => ({
      id: row.id,
      userId: row.user_id,
      content: row.content,
      createdAt: row._created_at,
    })),
    total: Number(total?.total ?? 0),
  };
}

export async function createComment(
  env: WorkerBindings,
  user: AuthUser,
  demandId: string,
  body: Record<string, unknown>,
) {
  if (!(await getDemand(env.DB, demandId))) {
    throw new ApiError(404, 'DEMAND_NOT_FOUND', '需求不存在');
  }
  const id = createId();
  const now = toDbTimestamp();
  await env.DB.prepare(
    `INSERT INTO demand_comment
      (id, demand_id, user_id, content, _created_at, _created_by, _updated_at, _updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, demandId, user.id, requiredString(body.content, 'content', 10_000), now, user.id, now, user.id)
    .run();
  return { id };
}

export async function updateDemandStatus(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  const demand = await assertDemandAccess(env, user, id);
  const status = parseDemandStatus(body.status);
  if (status === '跟进中' && !demand.assignee) {
    throw new ApiError(400, 'ASSIGNEE_REQUIRED', '进入跟进中状态前必须设置负责人');
  }
  const plannedSchedule = optionalIsoDate(body.plannedSchedule, 'plannedSchedule');
  await env.DB.prepare(
    `UPDATE demand
     SET status = ?, planned_schedule = CASE WHEN ? = 0 THEN planned_schedule ELSE ? END,
         _updated_at = ?, _updated_by = ?
     WHERE id = ?`,
  )
    .bind(
      status,
      plannedSchedule === undefined ? 0 : 1,
      plannedSchedule ?? null,
      toDbTimestamp(),
      user.id,
      id,
    )
    .run();
  return { success: true };
}

export async function updateDemandScore(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  await assertDemandAccess(env, user, id);
  const score = optionalNumber(body.manualScore, 'manualScore');
  if (score === undefined) throw new ApiError(400, 'VALIDATION_ERROR', 'manualScore不能为空');
  await env.DB.prepare(
    'UPDATE demand SET manual_score = ?, _updated_at = ?, _updated_by = ? WHERE id = ?',
  )
    .bind(score, toDbTimestamp(), user.id, id)
    .run();
  return { success: true };
}

export async function updateDemandAssignee(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  await assertDemandAccess(env, user, id);
  const assignee = parseNullableUserId(body.assignee);
  await env.DB.prepare(
    `UPDATE demand
     SET assignee = ?, status = CASE WHEN ? IS NULL THEN '待处理' ELSE status END,
         _updated_at = ?, _updated_by = ?
     WHERE id = ?`,
  )
    .bind(assignee, assignee, toDbTimestamp(), user.id, id)
    .run();
  return { success: true };
}

export async function assertDemandAccess(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
) {
  const demand = await getDemandWithSection(env.DB, id);
  if (!demand) throw new ApiError(404, 'DEMAND_NOT_FOUND', '需求不存在');
  if (!canManageSection(user.roles, demand.section)) {
    throw new ApiError(403, 'SECTION_FORBIDDEN', '无权操作当前板块的需求');
  }
  return demand;
}

function toDemandDetail(row: Awaited<ReturnType<typeof getDemandWithSection>> & {}) {
  return {
    id: row.id,
    title: row.title,
    background: row.background,
    department: row.department,
    creator: row.creator ?? '',
    submitterName: row.submitter_name,
    assignee: row.assignee,
    image: deserializeNullableAttachment(row.image, 'image'),
    createdAt: row._created_at,
    valueType: row.expected_value || null,
    gmvLevel: row.gmv_level,
    efficiencyAffected: row.efficiency_affected,
    efficiencySavedMinutes: row.efficiency_saved_minutes,
    expectedOnlineTime: row.expected_online_time,
    demandType: row.demand_type,
    isBlocking: row.is_blocking === null ? null : row.is_blocking === 1,
    priority: row.priority,
    plannedSchedule: row.planned_schedule,
    section: row.section,
    customFields: row.custom_fields ? JSON.parse(row.custom_fields) : null,
    formFields: row.form_fields ? JSON.parse(row.form_fields) : null,
  };
}
