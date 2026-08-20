import type { RuleRow } from '../db/types';

export function getRule(db: D1Database, id: string): Promise<RuleRow | null> {
  return db.prepare('SELECT * FROM rule WHERE id = ? LIMIT 1').bind(id).first<RuleRow>();
}
