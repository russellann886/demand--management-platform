import { Hono } from 'hono';
import { SYSTEM_ROLES, isSystemRole } from '../db/roles';
import type { AppRoleRow, AppUserRow, WorkerBindings } from '../db/types';
import { requireSuperAdmin } from '../auth/permissions';
import type { AuthVariables } from '../auth/types';
import { errorResponse } from '../http/errors';

type AuthEnv = {
  Bindings: WorkerBindings;
  Variables: AuthVariables;
};

type UserWithRolesRow = AppUserRow & {
  roles: string | null;
};

const authRoutes = new Hono<AuthEnv>();

authRoutes.get('/auth/me', (context) => {
  const user = context.get('user');
  return context.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      roles: user.roles,
    },
  });
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
    `SELECT u.*, GROUP_CONCAT(ur.role_code) AS roles
     FROM app_user u
     LEFT JOIN user_role ur ON ur.user_id = u.id
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

authRoutes.put(
  '/admin/users/:userId/roles',
  requireSuperAdmin,
  async (context) => {
    const body = await readJson(context.req.raw);
    if (!isRoleUpdateBody(body)) {
      return errorResponse(
        context,
        400,
        'INVALID_ROLE_UPDATE',
        'roles must be an array containing only known role codes.',
      );
    }

    const roles = [...new Set(body.roles)];
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
    const now = new Date().toISOString();
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

function toUserResponse(row: UserWithRolesRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? row.email.split('@')[0],
    avatarUrl: row.avatar_url,
    active: row.active === 1,
    lastSeenAt: row.last_seen_at,
    roles: (row.roles?.split(',') ?? []).filter(isSystemRole).sort(),
  };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isRoleUpdateBody(
  value: unknown,
): value is { roles: (typeof SYSTEM_ROLES)[number][] } {
  if (typeof value !== 'object' || value === null || !('roles' in value)) {
    return false;
  }
  const roles = (value as { roles?: unknown }).roles;
  return (
    Array.isArray(roles) &&
    roles.every((role) => typeof role === 'string' && isSystemRole(role))
  );
}

export default authRoutes;
