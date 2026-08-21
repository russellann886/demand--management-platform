import { createId, toDbTimestamp } from '../db/serialization';
import {
  grantInitialSuperAdmin,
  isSystemRole,
  type SystemRole,
} from '../db/roles';
import type { AppUserRow, WorkerBindings } from '../db/types';
import type { AuthUser, UserIdentity } from './types';

type UserWithCredentialRow = AppUserRow & {
  must_change_password: number | null;
};

export function resolveDevelopmentIdentity(
  bindings: Pick<
    WorkerBindings,
    'APP_ENV' | 'DEV_USER_EMAIL' | 'DEV_USER_NAME'
  >,
): UserIdentity | null {
  if (bindings.APP_ENV === 'production') return null;

  const email = normalizeEmail(bindings.DEV_USER_EMAIL);
  if (!email) return null;

  return {
    email,
    displayName:
      bindings.DEV_USER_NAME?.trim() || displayNameFromEmail(email),
    subject: null,
  };
}

export async function syncIdentityUser(
  db: D1Database,
  identity: UserIdentity,
  superAdminEmails: string | undefined,
): Promise<AuthUser> {
  const now = toDbTimestamp();
  let user = await findUser(db, identity.email);

  if (user) {
    await db
      .prepare(
        `UPDATE app_user
         SET display_name = ?, last_seen_at = ?, _updated_at = ?, _updated_by = id
         WHERE id = ?`,
      )
      .bind(identity.displayName, now, now, user.id)
      .run();
  } else {
    const id = createId();
    await db
      .prepare(
        `INSERT INTO app_user
          (id, email, display_name, active, last_seen_at, _created_by, _updated_by)
         VALUES (?, ?, ?, 1, ?, ?, ?)`,
      )
      .bind(id, identity.email, identity.displayName, now, id, id)
      .run();
    user = await findUser(db, identity.email);
  }

  if (!user) {
    throw new Error('Unable to load the authenticated user');
  }

  await grantInitialSuperAdmin(db, user.id, identity.email, superAdminEmails);
  const authUser = await loadAuthUserById(db, user.id);
  if (!authUser) throw new Error('Unable to load the authenticated user');
  return authUser;
}

export async function loadAuthUserById(
  db: D1Database,
  userId: string,
): Promise<AuthUser | null> {
  const user = await db
    .prepare(
      `SELECT u.*, c.must_change_password
       FROM app_user u
       LEFT JOIN app_credential c ON c.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
    )
    .bind(userId)
    .first<UserWithCredentialRow>();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name ?? displayNameFromEmail(user.email),
    avatarUrl: user.avatar_url,
    active: user.active === 1,
    mustChangePassword: user.must_change_password === 1,
    roles: await getUserRoles(db, user.id),
  };
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function findUser(
  db: D1Database,
  email: string,
): Promise<AppUserRow | null> {
  return db
    .prepare('SELECT * FROM app_user WHERE email = ? COLLATE NOCASE LIMIT 1')
    .bind(email)
    .first<AppUserRow>();
}

async function getUserRoles(
  db: D1Database,
  userId: string,
): Promise<SystemRole[]> {
  const result = await db
    .prepare(
      `SELECT role_code
       FROM user_role
       WHERE user_id = ?
       ORDER BY role_code`,
    )
    .bind(userId)
    .all<{ role_code: string }>();

  return result.results.map((row) => row.role_code).filter(isSystemRole);
}

function displayNameFromEmail(email: string): string {
  return email.split('@')[0] || email;
}
