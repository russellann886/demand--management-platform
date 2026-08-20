import type { DemandCategoryRow, DemandRow } from '../db/types';

export type DemandWithSection = DemandRow & {
  section: string | null;
  form_fields: string | null;
};

export function getDemand(db: D1Database, id: string): Promise<DemandRow | null> {
  return db.prepare('SELECT * FROM demand WHERE id = ? LIMIT 1').bind(id).first<DemandRow>();
}

export function getDemandWithSection(
  db: D1Database,
  id: string,
): Promise<DemandWithSection | null> {
  return db
    .prepare(
      `SELECT d.*, c.section, c.form_fields
       FROM demand d
       JOIN demand_category c ON c.id = d.category_id
       WHERE d.id = ?
       LIMIT 1`,
    )
    .bind(id)
    .first<DemandWithSection>();
}

export function getDemandCategory(
  db: D1Database,
  id: string,
): Promise<DemandCategoryRow | null> {
  return db
    .prepare('SELECT * FROM demand_category WHERE id = ? LIMIT 1')
    .bind(id)
    .first<DemandCategoryRow>();
}

export async function demandIdsInCategory(
  db: D1Database,
  categoryId: string,
  ids: readonly string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const result = await db
    .prepare(
      `SELECT id FROM demand
       WHERE category_id = ? AND id IN (${ids.map(() => '?').join(', ')})`,
    )
    .bind(categoryId, ...ids)
    .all<{ id: string }>();
  return result.results.map((row) => row.id);
}
