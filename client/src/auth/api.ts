import type {
  CurrentUser,
  ManagedUser,
  RoleDefinition,
  SystemRole,
} from './types';
import { apiRequest } from '@/api/client';
export { ApiError } from '@/api/client';

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiRequest<{ user: CurrentUser }>('/api/auth/me');
  return response.user;
}

export async function login(
  email: string,
  password: string,
): Promise<CurrentUser> {
  const response = await apiRequest<{ user: CurrentUser }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return response.user;
}

export async function logout(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST' });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiRequest('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export async function getUsers(): Promise<ManagedUser[]> {
  const response = await apiRequest<{ users: ManagedUser[] }>(
    '/api/admin/users',
  );
  return response.users;
}

export async function getRoles(): Promise<RoleDefinition[]> {
  const response = await apiRequest<{ roles: RoleDefinition[] }>(
    '/api/admin/roles',
  );
  return response.roles;
}

export async function updateUserRoles(
  userId: string,
  roles: SystemRole[],
): Promise<void> {
  await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/roles`, {
    method: 'PUT',
    body: { roles },
  });
}

export async function createUser(input: {
  email: string;
  displayName: string;
  password: string;
  roles: SystemRole[];
}): Promise<void> {
  await apiRequest('/api/admin/users', {
    method: 'POST',
    body: input,
  });
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  await apiRequest(
    `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: 'POST',
      body: { password },
    },
  );
}
