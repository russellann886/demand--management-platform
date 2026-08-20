import type { MiddlewareHandler } from 'hono';
import { SECTION_ADMIN_ROLES } from './sections';
import type { AuthVariables } from './types';
import type { SystemRole } from '../db/roles';
import type { WorkerBindings } from '../db/types';
import { resolveAccessIdentity, syncAuthenticatedUser } from './identity';
import { errorResponse } from '../http/errors';

type AuthEnv = {
  Bindings: WorkerBindings;
  Variables: AuthVariables;
};

export function hasRole(
  roles: readonly SystemRole[],
  requiredRoles: readonly SystemRole[],
): boolean {
  return (
    roles.includes('super_admin') ||
    requiredRoles.some((role) => roles.includes(role))
  );
}

export function managedSections(roles: readonly SystemRole[]): string[] | null {
  if (roles.includes('super_admin') || roles.includes('demand_admin')) {
    return null;
  }

  return [
    ...new Set(
      roles
        .map((role) => SECTION_ADMIN_ROLES[role])
        .filter((section): section is string => Boolean(section)),
    ),
  ];
}

export function canManageSection(
  roles: readonly SystemRole[],
  section: string | null,
): boolean {
  const sections = managedSections(roles);
  return sections === null || (section !== null && sections.includes(section));
}

export const requireAuth: MiddlewareHandler<AuthEnv> = async (
  context,
  next,
) => {
  const identity = resolveAccessIdentity(context.req.raw, context.env);
  if (!identity) {
    return errorResponse(
      context,
      401,
      'AUTH_REQUIRED',
      'Cloudflare Access identity is required.',
    );
  }

  const user = await syncAuthenticatedUser(
    context.env.DB,
    identity,
    context.env.SUPER_ADMIN_EMAILS,
  );
  if (!user.active) {
    return errorResponse(
      context,
      403,
      'USER_INACTIVE',
      'This user account has been disabled.',
    );
  }
  context.set('user', user);
  await next();
};

export function requireRoles(
  requiredRoles: readonly SystemRole[],
): MiddlewareHandler<AuthEnv> {
  return async (context, next) => {
    const user = context.get('user');
    if (!hasRole(user.roles, requiredRoles)) {
      return errorResponse(
        context,
        403,
        'FORBIDDEN',
        'You do not have permission to perform this action.',
      );
    }
    await next();
  };
}

export const requireSuperAdmin = requireRoles(['super_admin']);

export function requireSectionAdmin(
  getSection: (
    context: Parameters<MiddlewareHandler<AuthEnv>>[0],
  ) => string | null | Promise<string | null>,
): MiddlewareHandler<AuthEnv> {
  return async (context, next) => {
    const section = await getSection(context);
    if (!canManageSection(context.get('user').roles, section)) {
      return errorResponse(
        context,
        403,
        'SECTION_FORBIDDEN',
        'You do not have permission to manage this section.',
      );
    }
    await next();
  };
}
