import { Hono } from 'hono';
import { requireSuperAdmin } from '../auth/permissions';
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from '../auth/password';
import {
  clearSessionCookie,
  endSession,
  startSession,
} from '../auth/session';
import type { AuthVariables } from '../auth/types';
import { loadAuthUserById, normalizeEmail } from '../auth/identity';
import { SYSTEM_ROLES, isSystemRole } from '../db/roles';
import { createId, toDbTimestamp } from '../db/serialization';
import type {
  AppCredentialRow,
  AppRoleRow,
  AppUserRow,
  WorkerBindings,
} from '../db/types';
import { errorResponse } from '../http/errors';

type AuthEnv = {
  Bindings: WorkerBindings;
  Variables: AuthVariables;
};

type UserWithRolesRow = AppUserRow & {
  roles: string | null;
  has_password: number;
  must_change_password: number | null;
};

type LoginRow = AppUserRow &
  Pick<
    AppCredentialRow,
    | 'password_hash'
    | 'password_salt'
    | 'password_iterations'
    | 'failed_attempts'
    | 'locked_until'
  >;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const DUMMY_PASSWORD_HASH = {
  hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  salt: 'AAAAAAAAAAAAAAAAAAAAAA',
  iterations: 100_000,
};

export const publicAuthRoutes = new Hono<AuthEnv>();
const authRoutes = new Hono<AuthEnv>();

publicAuthRoutes.post('/auth/login', async (context) => {
  const body = await readJson(context.req.raw);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) {
    return errorResponse(
      context,
      400,
      'INVALID_LOGIN',
      '请输入有效的邮箱和密码。',
    );
  }

  const credential = await context.env.DB.prepare(
    `SELECT u.*, c.password_hash, c.password_salt, c.password_iterations,
            c.failed_attempts, c.locked_until
     FROM app_user u
     JOIN app_credential c ON c.user_id = u.id
     WHERE u.email = ? COLLATE NOCASE
     LIMIT 1`,
  )
    .bind(email)
    .first<LoginRow>();

  if (!credential) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return invalidCredentials(context);
  }
  if (!credential.active) {
    return invalidCredentials(context);
  }
  if (
    credential.locked_until &&
    Date.parse(credential.locked_until) > Date.now()
  ) {
    return errorResponse(
      context,
      429,
      'ACCOUNT_TEMPORARILY_LOCKED',
      '登录尝试过多，请 15 分钟后重试。',
    );
  }

  const valid = await verifyPassword(password, {
    hash: credential.password_hash,
    salt: credential.password_salt,
    iterations: credential.password_iterations,
  });
  if (!valid) {
    const failedAttempts = credential.failed_attempts + 1;
    const lockedUntil =
      failedAttempts >= MAX_LOGIN_ATTEMPTS
        ? toDbTimestamp(new Date(Date.now() + LOCK_MINUTES * 60 * 1000))
        : null;
    await context.env.DB.prepare(
      `UPDATE app_credential
       SET failed_attempts = ?, locked_until = ?, _updated_at = ?
       WHERE user_id = ?`,
    )
      .bind(
        lockedUntil ? 0 : failedAttempts,
        lockedUntil,
        toDbTimestamp(),
        credential.id,
      )
      .run();
    return lockedUntil
      ? errorResponse(
          context,
          429,
          'ACCOUNT_TEMPORARILY_LOCKED',
          '登录尝试过多，请 15 分钟后重试。',
        )
      : invalidCredentials(context);
  }

  const now = toDbTimestamp();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE app_credential
       SET failed_attempts = 0, locked_until = NULL, _updated_at = ?,
           _updated_by = ?
       WHERE user_id = ?`,
    ).bind(now, credential.id, credential.id),
    context.env.DB.prepare(
      `DELETE FROM app_session
       WHERE expires_at <= ? OR revoked_at IS NOT NULL`,
    ).bind(now),
  ]);
  await startSession(context, credential.id);
  const user = await loadAuthUserById(context.env.DB, credential.id);
  if (!user) throw new Error('Unable to load the authenticated user');

  context.header('cache-control', 'no-store');
  return context.json({ user });
});

publicAuthRoutes.post('/auth/logout', async (context) => {
  await endSession(context);
  return context.body(null, 204);
});

authRoutes.get('/auth/me', (context) => {
  const user = context.get('user');
  context.header('cache-control', 'no-store');
  return context.json({ user });
});

authRoutes.post('/auth/change-password', async (context) => {
  const body = await readJson(context.req.raw);
  const currentPassword =
    typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword =
    typeof body?.newPassword === 'string' ? body.newPassword : '';
  const validationError = validatePassword(newPassword);
  if (!currentPassword || validationError) {
    return errorResponse(
      context,
      400,
      'INVALID_PASSWORD_CHANGE',
      validationError ?? '请输入当前密码。',
    );
  }

  const user = context.get('user');
  const credential = await context.env.DB.prepare(
    `SELECT * FROM app_credential WHERE user_id = ? LIMIT 1`,
  )
    .bind(user.id)
    .first<AppCredentialRow>();
  if (
    !credential ||
    !(await verifyPassword(currentPassword, {
      hash: credential.password_hash,
      salt: credential.password_salt,
      iterations: credential.password_iterations,
    }))
  ) {
    return errorResponse(
      context,
      400,
      'CURRENT_PASSWORD_INVALID',
      '当前密码不正确。',
    );
  }

  const next = await hashPassword(newPassword);
  const now = toDbTimestamp();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE app_credential
       SET password_hash = ?, password_salt = ?, password_iterations = ?,
           must_change_password = 0, failed_attempts = 0, locked_until = NULL,
           password_changed_at = ?, _updated_at = ?, _updated_by = ?
       WHERE user_id = ?`,
    ).bind(
      next.hash,
      next.salt,
      next.iterations,
      now,
      now,
      user.id,
      user.id,
    ),
    context.env.DB.prepare(
      `UPDATE app_session
       SET revoked_at = ?, _updated_at = ?, _updated_by = ?
       WHERE user_id = ? AND revoked_at IS NULL`,
    ).bind(now, now, user.id, user.id),
  ]);
  clearSessionCookie(context);
  await startSession(context, user.id);
  return context.json({ success: true });
});

authRoutes.get('/admin/roles', requireSuperAdmin, async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT *
     FROM app_role
     WHERE is_system = 1
     ORDER BY CASE code
       WHEN 'super_admin' THEN 0
       WHEN 'demand_admin' THEN 1
       ELSE 2
     END, name`,
  ).all<AppRoleRow>();

  return context.json({
    roles: result.results.map((role) => ({
      code: role.code,
      name: role.name,
      description: role.description,
      section: role.section,
    })),
  });
});

authRoutes.get('/admin/users', requireSuperAdmin, async (context) => {
  const query = context.req.query('query')?.trim() ?? '';
  const search = `%${query}%`;
  const result = await context.env.DB.prepare(
    `SELECT u.*, GROUP_CONCAT(ur.role_code) AS roles,
            MAX(CASE WHEN c.user_id IS NULL THEN 0 ELSE 1 END) AS has_password,
            MAX(c.must_change_password) AS must_change_password
     FROM app_user u
     LEFT JOIN user_role ur ON ur.user_id = u.id
     LEFT JOIN app_credential c ON c.user_id = u.id
     WHERE (? = '' OR u.email LIKE ? OR COALESCE(u.display_name, '') LIKE ?)
     GROUP BY u.id
     ORDER BY u.last_seen_at DESC, u._created_at DESC
     LIMIT 100`,
  )
    .bind(query, search, search)
    .all<UserWithRolesRow>();

  return context.json({
    users: result.results.map(toUserResponse),
  });
});

authRoutes.post('/admin/users', requireSuperAdmin, async (context) => {
  const body = await readJson(context.req.raw);
  const email = normalizeEmail(body?.email);
  const displayName =
    typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const roles = readRoles(body?.roles);
  const passwordError = validatePassword(password);
  if (!email || !displayName || displayName.length > 100 || !roles) {
    return errorResponse(
      context,
      400,
      'INVALID_USER',
      '请输入有效的姓名、邮箱和角色。',
    );
  }
  if (passwordError) {
    return errorResponse(context, 400, 'INVALID_PASSWORD', passwordError);
  }
  if (
    await context.env.DB.prepare(
      'SELECT 1 AS found FROM app_user WHERE email = ? COLLATE NOCASE',
    )
      .bind(email)
      .first()
  ) {
    return errorResponse(
      context,
      409,
      'EMAIL_ALREADY_EXISTS',
      '该邮箱已存在。',
    );
  }

  const actorId = context.get('user').id;
  const userId = createId();
  const now = toDbTimestamp();
  const passwordHash = await hashPassword(password);
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO app_user
        (id, email, display_name, active, _created_at, _created_by,
         _updated_at, _updated_by)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
    ).bind(userId, email, displayName, now, actorId, now, actorId),
    context.env.DB.prepare(
      `INSERT INTO app_credential
        (user_id, password_hash, password_salt, password_iterations,
         must_change_password, password_changed_at, _created_at, _created_by,
         _updated_at, _updated_by)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    ).bind(
      userId,
      passwordHash.hash,
      passwordHash.salt,
      passwordHash.iterations,
      now,
      now,
      actorId,
      now,
      actorId,
    ),
    ...roles.map((role) =>
      context.env.DB.prepare(
        `INSERT INTO user_role
          (user_id, role_code, _created_at, _created_by, _updated_at, _updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(userId, role, now, actorId, now, actorId),
    ),
  ]);

  return context.json({ userId }, 201);
});

authRoutes.post(
  '/admin/users/:userId/reset-password',
  requireSuperAdmin,
  async (context) => {
    const body = await readJson(context.req.raw);
    const password = typeof body?.password === 'string' ? body.password : '';
    const passwordError = validatePassword(password);
    if (passwordError) {
      return errorResponse(context, 400, 'INVALID_PASSWORD', passwordError);
    }

    const userId = context.req.param('userId');
    const target = await context.env.DB.prepare(
      'SELECT id FROM app_user WHERE id = ? LIMIT 1',
    )
      .bind(userId)
      .first<{ id: string }>();
    if (!target) {
      return errorResponse(
        context,
        404,
        'USER_NOT_FOUND',
        '指定用户不存在。',
      );
    }

    const actorId = context.get('user').id;
    const now = toDbTimestamp();
    const passwordHash = await hashPassword(password);
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO app_credential
          (user_id, password_hash, password_salt, password_iterations,
           must_change_password, password_changed_at, _created_at, _created_by,
           _updated_at, _updated_by)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           password_hash = excluded.password_hash,
           password_salt = excluded.password_salt,
           password_iterations = excluded.password_iterations,
           must_change_password = 1,
           failed_attempts = 0,
           locked_until = NULL,
           password_changed_at = excluded.password_changed_at,
           _updated_at = excluded._updated_at,
           _updated_by = excluded._updated_by`,
      ).bind(
        userId,
        passwordHash.hash,
        passwordHash.salt,
        passwordHash.iterations,
        now,
        now,
        actorId,
        now,
        actorId,
      ),
      context.env.DB.prepare(
        `UPDATE app_session
         SET revoked_at = ?, _updated_at = ?, _updated_by = ?
         WHERE user_id = ? AND revoked_at IS NULL`,
      ).bind(now, now, actorId, userId),
    ]);
    return context.json({ success: true });
  },
);

authRoutes.put(
  '/admin/users/:userId/roles',
  requireSuperAdmin,
  async (context) => {
    const body = await readJson(context.req.raw);
    const roles = readRoles(body?.roles);
    if (!roles) {
      return errorResponse(
        context,
        400,
        'INVALID_ROLE_UPDATE',
        'roles must be an array containing only known role codes.',
      );
    }

    const target = await context.env.DB.prepare(
      'SELECT id FROM app_user WHERE id = ? LIMIT 1',
    )
      .bind(context.req.param('userId'))
      .first<{ id: string }>();
    if (!target) {
      return errorResponse(
        context,
        404,
        'USER_NOT_FOUND',
        'The requested user does not exist.',
      );
    }

    const actorId = context.get('user').id;
    const now = toDbTimestamp();
    const statements = [
      context.env.DB.prepare('DELETE FROM user_role WHERE user_id = ?').bind(
        target.id,
      ),
      ...roles.map((role) =>
        context.env.DB.prepare(
          `INSERT INTO user_role
            (user_id, role_code, _created_at, _created_by, _updated_at, _updated_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(target.id, role, now, actorId, now, actorId),
      ),
    ];
    await context.env.DB.batch(statements);

    return context.json({ userId: target.id, roles });
  },
);

function invalidCredentials(context: Parameters<typeof errorResponse>[0]) {
  return errorResponse(
    context,
    401,
    'INVALID_CREDENTIALS',
    '邮箱或密码不正确。',
  );
}

function toUserResponse(row: UserWithRolesRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? row.email.split('@')[0],
    avatarUrl: row.avatar_url,
    active: row.active === 1,
    lastSeenAt: row.last_seen_at,
    hasPassword: row.has_password === 1,
    mustChangePassword: row.must_change_password === 1,
    roles: (row.roles?.split(',') ?? []).filter(isSystemRole).sort(),
  };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readRoles(value: unknown): (typeof SYSTEM_ROLES)[number][] | null {
  return Array.isArray(value) &&
    value.every((role) => typeof role === 'string' && isSystemRole(role))
    ? [...new Set(value)]
    : null;
}

export default authRoutes;
