import type { MergedDemandRow } from '../db/types';

export type MergedWithSection = MergedDemandRow & { section: string | null };

export function getMergedDemand(
  db: D1Database,
  id: string,
): Promise<MergedWithSection | null> {
  return db
    .prepare(
      `SELECT m.*, c.section
       FROM merged_demand m
       JOIN demand_category c ON c.id = m.category_id
       WHERE m.id = ? LIMIT 1`,
    )
    .bind(id)
    .first<MergedWithSection>();
}

export async function existingMergedSourceIds(
  db: D1Database,
  demandIds: readonly string[],
  excludeMergedId?: string,
): Promise<string[]> {
  if (demandIds.length === 0) return [];
  const result = await db
    .prepare(
      `SELECT demand_id FROM merged_demand_source
       WHERE demand_id IN (${demandIds.map(() => '?').join(', ')})
       ${excludeMergedId ? 'AND merged_demand_id <> ?' : ''}`,
    )
    .bind(...demandIds, ...(excludeMergedId ? [excludeMergedId] : []))
    .all<{ demand_id: string }>();
  return result.results.map((row) => row.demand_id);
}
