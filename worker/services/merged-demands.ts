import { canManageSection } from '../auth/permissions';
import type { AuthUser } from '../auth/types';
import {
  createId,
  deserializeNullableAttachment,
  toDbTimestamp,
} from '../db/serialization';
import type { DemandRow, MergedDemandRow, WorkerBindings } from '../db/types';
import {
  ApiError,
  optionalIsoDate,
  optionalNumber,
  optionalString,
  requiredString,
  stringArray,
} from '../http/request';
import {
  demandIdsInCategory,
  getDemandCategory,
} from '../repositories/demands';
import {
  existingMergedSourceIds,
  getMergedDemand,
} from '../repositories/merged-demands';
import {
  parseDemandStatus,
  parseNullableUserId,
} from './contracts';

export async function listSourceDemands(
  env: WorkerBindings,
  user: AuthUser,
  categoryId: string,
) {
  await assertCategoryAccess(env, user, categoryId);
  const result = await env.DB.prepare(
    `SELECT * FROM demand WHERE category_id = ? ORDER BY _created_at DESC`,
  )
    .bind(categoryId)
    .all<DemandRow>();
  return { items: result.results.map(toSourceDemand) };
}

export async function listMergedDemands(
  env: WorkerBindings,
  user: AuthUser,
  categoryId: string,
) {
  await assertCategoryAccess(env, user, categoryId);
  const [mains, sources] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM merged_demand
       WHERE category_id = ? ORDER BY _created_at DESC`,
    )
      .bind(categoryId)
      .all<MergedDemandRow>(),
    env.DB.prepare(
      `SELECT s.merged_demand_id, s.demand_id, d.title
       FROM merged_demand_source s
       JOIN merged_demand m ON m.id = s.merged_demand_id
       JOIN demand d ON d.id = s.demand_id
       WHERE m.category_id = ?
       ORDER BY s._created_at`,
    )
      .bind(categoryId)
      .all<{ merged_demand_id: string; demand_id: string; title: string }>(),
  ]);
  const sourceMap = new Map<string, Array<{ demandId: string; title: string }>>();
  for (const source of sources.results) {
    const list = sourceMap.get(source.merged_demand_id) ?? [];
    list.push({ demandId: source.demand_id, title: source.title });
    sourceMap.set(source.merged_demand_id, list);
  }
  return {
    items: mains.results.map((row) => ({
      id: row.id,
      title: row.title,
      reason: row.reason,
      status: row.status,
      assignee: row.assignee,
      followUpFeedback: row.follow_up_feedback,
      sources: sourceMap.get(row.id) ?? [],
      createdAt: row._created_at,
      updatedAt: row._updated_at,
      manualScore: row.manual_score,
      plannedSchedule: row.planned_schedule,
    })),
  };
}

export async function createMergedDemand(
  env: WorkerBindings,
  user: AuthUser,
  body: Record<string, unknown>,
) {
  const categoryId = requiredString(body.categoryId, 'categoryId', 100);
  await assertCategoryAccess(env, user, categoryId);
  const demandIds = await validateSources(env, categoryId, body.demandIds);
  const id = createId();
  const now = toDbTimestamp();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO merged_demand
        (id, title, reason, category_id, _created_at, _created_by, _updated_at, _updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      requiredString(body.title, 'title', 500),
      requiredString(body.reason, 'reason', 100_000),
      categoryId,
      now,
      user.id,
      now,
      user.id,
    ),
    ...sourceInsertStatements(env.DB, id, demandIds, user.id, now),
  ]);
  return { id };
}

export async function updateMergedDemand(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await assertMergedAccess(env, user, id);
  const values: unknown[] = [toDbTimestamp(), user.id];
  const updates = ['_updated_at = ?', '_updated_by = ?'];
  addUpdate(updates, values, 'title', body.title, (value) =>
    requiredString(value, 'title', 500),
  );
  addUpdate(updates, values, 'reason', body.reason, (value) =>
    requiredString(value, 'reason', 100_000),
  );
  let targetAssignee = existing.assignee;
  if (body.assignee !== undefined) {
    targetAssignee = parseNullableUserId(body.assignee);
    updates.push('assignee = ?');
    values.push(targetAssignee);
    if (targetAssignee === null) {
      updates.push("status = '待处理'");
    }
  }
  if (body.status !== undefined) {
    const status = parseDemandStatus(body.status);
    if (status === '跟进中' && !targetAssignee) {
      throw new ApiError(400, 'ASSIGNEE_REQUIRED', '进入跟进中状态前必须设置负责人');
    }
    updates.push('status = ?');
    values.push(status);
  }
  addUpdate(updates, values, 'follow_up_feedback', body.followUpFeedback, (value) =>
    optionalString(value, 'followUpFeedback', 100_000) ?? null,
  );
  addUpdate(updates, values, 'manual_score', body.manualScore, (value) => {
    const score = optionalNumber(value, 'manualScore');
    return score ?? null;
  });
  addUpdate(updates, values, 'planned_schedule', body.plannedSchedule, (value) =>
    optionalIsoDate(value, 'plannedSchedule') ?? null,
  );

  const statements: ReturnType<WorkerBindings['DB']['prepare']>[] = [
    env.DB.prepare(`UPDATE merged_demand SET ${updates.join(', ')} WHERE id = ?`).bind(
      ...values,
      id,
    ),
  ];
  if (body.demandIds !== undefined) {
    const requestedIds = stringArray(body.demandIds, 'demandIds');
    if (requestedIds.length > 0) {
      const demandIds = await validateSources(
        env,
        existing.category_id,
        requestedIds,
        id,
      );
      statements.push(
        env.DB.prepare('DELETE FROM merged_demand_source WHERE merged_demand_id = ?').bind(id),
        ...sourceInsertStatements(env.DB, id, demandIds, user.id, toDbTimestamp()),
      );
    }
  }
  await env.DB.batch(statements);
  return { id };
}

export async function deleteMergedDemand(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
) {
  await assertMergedAccess(env, user, id);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM merged_demand_source WHERE merged_demand_id = ?').bind(id),
    env.DB.prepare('DELETE FROM merged_demand WHERE id = ?').bind(id),
  ]);
  return { id };
}

export async function addMergedSources(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await assertMergedAccess(env, user, id);
  const requested = stringArray(body.demandIds, 'demandIds');
  if (requested.length === 0) {
    throw new ApiError(400, 'SOURCES_REQUIRED', '至少需要添加一个来源需求');
  }
  const valid = await demandIdsInCategory(env.DB, existing.category_id, requested);
  if (valid.length !== requested.length) {
    throw new ApiError(400, 'INVALID_SOURCES', '来源需求必须存在且属于同一栏目');
  }
  const conflicts = await existingMergedSourceIds(env.DB, requested, id);
  if (conflicts.length) {
    throw new ApiError(409, 'SOURCE_ALREADY_MERGED', '部分来源需求已属于其他整合需求', {
      demandIds: conflicts,
    });
  }
  const current = await env.DB.prepare(
    'SELECT demand_id FROM merged_demand_source WHERE merged_demand_id = ?',
  )
    .bind(id)
    .all<{ demand_id: string }>();
  const existingIds = new Set(current.results.map((row) => row.demand_id));
  const newIds = requested.filter((demandId) => !existingIds.has(demandId));
  if (newIds.length) {
    const now = toDbTimestamp();
    await env.DB.batch([
      ...sourceInsertStatements(env.DB, id, newIds, user.id, now),
      env.DB.prepare(
        'UPDATE merged_demand SET _updated_at = ?, _updated_by = ? WHERE id = ?',
      ).bind(now, user.id, id),
    ]);
  }
  return { id };
}

export async function releaseMergedSource(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  demandId: string,
) {
  await assertMergedAccess(env, user, id);
  const source = await env.DB.prepare(
    `SELECT demand_id FROM merged_demand_source
     WHERE merged_demand_id = ? AND demand_id = ? LIMIT 1`,
  )
    .bind(id, demandId)
    .first<{ demand_id: string }>();
  if (!source) throw new ApiError(404, 'SOURCE_NOT_FOUND', '整合来源不存在');
  const count = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM merged_demand_source WHERE merged_demand_id = ?',
  )
    .bind(id)
    .first<{ total: number }>();
  const dissolved = Number(count?.total ?? 0) <= 2;
  if (dissolved) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM merged_demand_source WHERE merged_demand_id = ?').bind(id),
      env.DB.prepare('DELETE FROM merged_demand WHERE id = ?').bind(id),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare(
        'DELETE FROM merged_demand_source WHERE merged_demand_id = ? AND demand_id = ?',
      ).bind(id, demandId),
      env.DB.prepare(
        'UPDATE merged_demand SET _updated_at = ?, _updated_by = ? WHERE id = ?',
      ).bind(toDbTimestamp(), user.id, id),
    ]);
  }
  return { id, dissolved };
}

async function validateSources(
  env: WorkerBindings,
  categoryId: string,
  value: unknown,
  excludeMergedId?: string,
): Promise<string[]> {
  const ids = stringArray(value, 'demandIds');
  if (ids.length < 2) {
    throw new ApiError(400, 'INSUFFICIENT_SOURCES', '整合需求至少需要两个来源需求');
  }
  const validIds = await demandIdsInCategory(env.DB, categoryId, ids);
  if (validIds.length !== ids.length) {
    throw new ApiError(400, 'INVALID_SOURCES', '来源需求必须存在且属于同一栏目');
  }
  const conflicts = await existingMergedSourceIds(env.DB, ids, excludeMergedId);
  if (conflicts.length) {
    throw new ApiError(409, 'SOURCE_ALREADY_MERGED', '部分来源需求已属于其他整合需求', {
      demandIds: conflicts,
    });
  }
  return ids;
}

async function assertCategoryAccess(
  env: WorkerBindings,
  user: AuthUser,
  categoryId: string,
) {
  if (!categoryId) throw new ApiError(400, 'CATEGORY_REQUIRED', 'categoryId不能为空');
  const category = await getDemandCategory(env.DB, categoryId);
  if (!category) throw new ApiError(404, 'CATEGORY_NOT_FOUND', '栏目不存在');
  if (!canManageSection(user.roles, category.section)) {
    throw new ApiError(403, 'SECTION_FORBIDDEN', '无权操作当前板块的整合需求');
  }
  return category;
}

async function assertMergedAccess(env: WorkerBindings, user: AuthUser, id: string) {
  const merged = await getMergedDemand(env.DB, id);
  if (!merged) throw new ApiError(404, 'MERGED_DEMAND_NOT_FOUND', '整合需求不存在');
  if (!canManageSection(user.roles, merged.section)) {
    throw new ApiError(403, 'SECTION_FORBIDDEN', '无权操作当前板块的整合需求');
  }
  return merged;
}

function sourceInsertStatements(
  db: WorkerBindings['DB'],
  mergedId: string,
  demandIds: readonly string[],
  userId: string,
  now: string,
) {
  return demandIds.map((demandId) =>
    db
      .prepare(
        `INSERT INTO merged_demand_source
          (id, merged_demand_id, demand_id, _created_at, _created_by, _updated_at, _updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(createId(), mergedId, demandId, now, userId, now, userId),
  );
}

function toSourceDemand(row: DemandRow) {
  return {
    id: row.id,
    title: row.title,
    background: row.background,
    department: row.department,
    creator: row.creator ?? '',
    submitterName: row.submitter_name,
    image: deserializeNullableAttachment(row.image, 'image'),
    createdAt: row._created_at,
    status: row.status,
    assignee: row.assignee,
    followUpFeedback: row.follow_up_feedback,
    valueType: row.expected_value || null,
    gmvLevel: row.gmv_level,
    efficiencyAffected: row.efficiency_affected,
    efficiencySavedMinutes: row.efficiency_saved_minutes,
    expectedOnlineTime: row.expected_online_time,
    demandType: row.demand_type,
    isBlocking: row.is_blocking === null ? null : row.is_blocking === 1,
    priority: row.priority,
    manualScore: row.manual_score,
    plannedSchedule: row.planned_schedule,
    customFields: row.custom_fields ? JSON.parse(row.custom_fields) : null,
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
