export const SYSTEM_ROLES = [
  'super_admin',
  'demand_admin',
  'admin_goods',
  'admin_coupon',
  'admin_replenish',
  'admin_content',
  'admin_shelf',
  'admin_campaign',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const SUPER_ADMIN_ROLE: SystemRole = 'super_admin';

export function isSystemRole(value: string): value is SystemRole {
  return (SYSTEM_ROLES as readonly string[]).includes(value);
}

export function parseInitialAdminEmails(
  value: string | undefined,
): Set<string> {
  const emails = new Set<string>();

  for (const item of value?.split(',') ?? []) {
    const email = item.trim().toLowerCase();
    if (email && isEmail(email)) {
      emails.add(email);
    }
  }

  return emails;
}

export function isInitialAdmin(
  email: string,
  configuredEmails: string | undefined,
): boolean {
  return parseInitialAdminEmails(configuredEmails).has(
    email.trim().toLowerCase(),
  );
}

export async function grantInitialSuperAdmin(
  db: D1Database,
  userId: string,
  email: string,
  configuredEmails: string | undefined,
): Promise<boolean> {
  if (!isInitialAdmin(email, configuredEmails)) {
    return false;
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO user_role
        (user_id, role_code, _created_by, _updated_by)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(userId, SUPER_ADMIN_ROLE, userId, userId)
    .run();

  return true;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
