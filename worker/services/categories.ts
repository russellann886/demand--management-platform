import { canManageSection, managedSections } from '../auth/permissions';
import type { AuthUser } from '../auth/types';
import { createId, deserializeStringArray, serializeStringArray, toDbBoolean, toDbTimestamp } from '../db/serialization';
import type { WorkerBindings } from '../db/types';
import { ApiError, optionalBoolean, optionalString, requiredString, stringArray } from '../http/request';
import { boardAdmins, getCategory, listCategories } from '../repositories/categories';
import { parseFormFields } from './contracts';

const BOARD_SECTIONS = [
  '消费券&货品板块',
  '追补板块',
  '内容场板块',
  '货架场板块',
  '大促运营工具包板块',
] as const;

export async function getCategories(
  env: WorkerBindings,
  onlyEnabled: boolean,
  user?: AuthUser,
) {
  const rows = await listCategories(
    env.DB,
    onlyEnabled,
    onlyEnabled ? null : managedSections(user?.roles ?? []),
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: row.enabled === 1,
      departments: deserializeStringArray(row.departments, 'departments'),
      section: row.section,
      formFields: row.form_fields ? JSON.parse(row.form_fields) : null,
      demandCount: Number(row.demand_count ?? 0),
      statusCounts: {
        待处理: Number(row.pending_count ?? 0),
        跟进中: Number(row.in_progress_count ?? 0),
        已完成: Number(row.completed_count ?? 0),
        已关闭: Number(row.closed_count ?? 0),
      },
      createdAt: row._created_at,
    })),
  };
}

export async function createCategory(
  env: WorkerBindings,
  user: AuthUser,
  body: Record<string, unknown>,
) {
  const section = optionalString(body.section, 'section', 100) ?? null;
  assertSectionAccess(user, section, '无权在当前板块创建栏目');
  const id = createId();
  const now = toDbTimestamp();
  const formFields =
    body.formFields === undefined ? null : parseFormFields(body.formFields);
  await env.DB.prepare(
    `INSERT INTO demand_category
      (id, name, description, departments, section, form_fields,
       _created_at, _created_by, _updated_at, _updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      requiredString(body.name, 'name', 200),
      optionalString(body.description, 'description') ?? '',
      serializeStringArray(
        body.departments === undefined ? [] : stringArray(body.departments, 'departments'),
      ),
      section,
      formFields === null ? null : JSON.stringify(formFields),
      now,
      user.id,
      now,
      user.id,
    )
    .run();
  return { id };
}

export async function updateCategory(
  env: WorkerBindings,
  user: AuthUser,
  id: string,
  body: Record<string, unknown>,
) {
  const existing = await getCategory(env.DB, id);
  if (!existing) throw new ApiError(404, 'CATEGORY_NOT_FOUND', '栏目不存在');
  assertSectionAccess(user, existing.section, '无权管理当前板块的栏目');
  if (body.section !== undefined) {
    assertSectionAccess(
      user,
      optionalString(body.section, 'section', 100) ?? null,
      '无权将栏目移至目标板块',
    );
  }

  const updates: string[] = ['_updated_at = ?', '_updated_by = ?'];
  const values: unknown[] = [toDbTimestamp(), user.id];
  addUpdate(updates, values, 'name', body.name, (value) => requiredString(value, 'name', 200));
  addUpdate(updates, values, 'description', body.description, (value) => optionalString(value, 'description') ?? '');
  addUpdate(updates, values, 'enabled', body.enabled, (value) => toDbBoolean(optionalBoolean(value, 'enabled')!));
  addUpdate(updates, values, 'departments', body.departments, (value) => serializeStringArray(stringArray(value, 'departments')));
  addUpdate(updates, values, 'section', body.section, (value) => optionalString(value, 'section', 100) ?? null);
  addUpdate(updates, values, 'form_fields', body.formFields, (value) => {
    const fields = parseFormFields(value);
    return fields === null ? null : JSON.stringify(fields);
  });
  await env.DB.prepare(`UPDATE demand_category SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values, id)
    .run();
  return { id };
}

export async function getBoardAdmins(env: WorkerBindings) {
  const result: Record<string, string[]> = Object.fromEntries(
    BOARD_SECTIONS.map((section) => [section, []]),
  );
  for (const row of await boardAdmins(env.DB)) {
    result[row.section] ??= [];
    if (!result[row.section].includes(row.user_id)) result[row.section].push(row.user_id);
  }
  return result;
}

function assertSectionAccess(user: AuthUser, section: string | null, message: string) {
  if (!canManageSection(user.roles, section)) {
    throw new ApiError(403, 'SECTION_FORBIDDEN', message);
  }
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
