import { createId, toDbTimestamp } from '../db/serialization';
import {
  grantInitialSuperAdmin,
  isSystemRole,
  type SystemRole,
} from '../db/roles';
import type { AppUserRow, WorkerBindings } from '../db/types';
import type { AccessIdentity, AuthUser } from './types';

const ACCESS_EMAIL_HEADER = 'cf-access-authenticated-user-email';
const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion';

type AccessJwtClaims = {
  email?: unknown;
  name?: unknown;
  given_name?: unknown;
  sub?: unknown;
};

export function resolveAccessIdentity(
  request: Request,
  bindings: Pick<
    WorkerBindings,
    'APP_ENV' | 'DEV_USER_EMAIL' | 'DEV_USER_NAME'
  >,
): AccessIdentity | null {
  const accessEmail = normalizeEmail(request.headers.get(ACCESS_EMAIL_HEADER));
  const claims = parseJwtClaims(request.headers.get(ACCESS_JWT_HEADER));

  if (accessEmail) {
    return {
      email: accessEmail,
      displayName: resolveDisplayName(claims, accessEmail),
      subject: asNonEmptyString(claims?.sub),
    };
  }

  if (bindings.APP_ENV !== 'production') {
    const devEmail = normalizeEmail(bindings.DEV_USER_EMAIL);
    if (devEmail) {
      return {
        email: devEmail,
        displayName:
          bindings.DEV_USER_NAME?.trim() || displayNameFromEmail(devEmail),
        subject: null,
      };
    }
  }

  return null;
}

export async function syncAuthenticatedUser(
  db: D1Database,
  identity: AccessIdentity,
  superAdminEmails: string | undefined,
): Promise<AuthUser> {
  const now = toDbTimestamp();
  let user = await findUser(db, identity);

  if (user) {
    await db
      .prepare(
        `UPDATE app_user
         SET email = ?, display_name = ?, access_subject = COALESCE(?, access_subject),
             last_seen_at = ?, _updated_at = ?, _updated_by = id
         WHERE id = ?`,
      )
      .bind(
        identity.email,
        identity.displayName,
        identity.subject,
        now,
        now,
        user.id,
      )
      .run();
  } else {
    const id = createId();
    await db
      .prepare(
        `INSERT INTO app_user
          (id, email, display_name, access_subject, active, last_seen_at,
           _created_by, _updated_by)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .bind(
        id,
        identity.email,
        identity.displayName,
        identity.subject,
        now,
        id,
        id,
      )
      .run();
    user = await getUserById(db, id);
  }

  if (!user) {
    throw new Error('Unable to load the authenticated user');
  }

  await grantInitialSuperAdmin(db, user.id, identity.email, superAdminEmails);

  return {
    id: user.id,
    email: identity.email,
    displayName: identity.displayName,
    avatarUrl: user.avatar_url,
    active: user.active === 1,
    roles: await getUserRoles(db, user.id),
  };
}

async function findUser(
  db: D1Database,
  identity: AccessIdentity,
): Promise<AppUserRow | null> {
  if (identity.subject) {
    const bySubject = await db
      .prepare('SELECT * FROM app_user WHERE access_subject = ? LIMIT 1')
      .bind(identity.subject)
      .first<AppUserRow>();
    if (bySubject) return bySubject;
  }

  return db
    .prepare('SELECT * FROM app_user WHERE email = ? COLLATE NOCASE LIMIT 1')
    .bind(identity.email)
    .first<AppUserRow>();
}

async function getUserById(
  db: D1Database,
  userId: string,
): Promise<AppUserRow | null> {
  return db
    .prepare('SELECT * FROM app_user WHERE id = ? LIMIT 1')
    .bind(userId)
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

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function resolveDisplayName(
  claims: AccessJwtClaims | null,
  email: string,
): string {
  return (
    asNonEmptyString(claims?.name) ??
    asNonEmptyString(claims?.given_name) ??
    displayNameFromEmail(email)
  );
}

function displayNameFromEmail(email: string): string {
  return email.split('@')[0] || email;
}

function parseJwtClaims(assertion: string | null): AccessJwtClaims | null {
  if (!assertion) return null;
  const payload = assertion.split('.')[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const decoded = atob(padded);
    const bytes = Uint8Array.from(decoded, (character) =>
      character.charCodeAt(0),
    );
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as AccessJwtClaims)
      : null;
  } catch {
    return null;
  }
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
