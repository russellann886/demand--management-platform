import type { DemandCategoryRow } from '../db/types';

export type CategoryListRow = DemandCategoryRow & {
  demand_count: number;
  pending_count: number;
  in_progress_count: number;
  completed_count: number;
  closed_count: number;
};

export async function listCategories(
  db: D1Database,
  onlyEnabled: boolean,
  sections: readonly string[] | null,
): Promise<CategoryListRow[]> {
  if (sections !== null && sections.length === 0) return [];
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (onlyEnabled) conditions.push('c.enabled = 1');
  if (sections !== null) {
    conditions.push(`c.section IN (${sections.map(() => '?').join(', ')})`);
    bindings.push(...sections);
  }
  const result = await db
    .prepare(
      `SELECT c.*,
         COUNT(d.id) AS demand_count,
         SUM(CASE WHEN d.status = '待处理' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN d.status = '跟进中' THEN 1 ELSE 0 END) AS in_progress_count,
         SUM(CASE WHEN d.status = '已完成' THEN 1 ELSE 0 END) AS completed_count,
         SUM(CASE WHEN d.status = '已关闭' THEN 1 ELSE 0 END) AS closed_count
       FROM demand_category c
       LEFT JOIN demand d ON d.category_id = c.id
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       GROUP BY c.id
       ORDER BY c._created_at DESC`,
    )
    .bind(...bindings)
    .all<CategoryListRow>();
  return result.results;
}

export function getCategory(
  db: D1Database,
  id: string,
): Promise<DemandCategoryRow | null> {
  return db
    .prepare('SELECT * FROM demand_category WHERE id = ? LIMIT 1')
    .bind(id)
    .first<DemandCategoryRow>();
}

export async function boardAdmins(
  db: D1Database,
): Promise<Array<{ section: string; user_id: string }>> {
  const result = await db
    .prepare(
      `SELECT DISTINCT r.section, ur.user_id
       FROM user_role ur
       JOIN app_role r ON r.code = ur.role_code
       JOIN app_user u ON u.id = ur.user_id
       WHERE r.section IS NOT NULL AND u.active = 1
       ORDER BY r.section, ur.user_id`,
    )
    .all<{ section: string; user_id: string }>();
  return result.results;
}
