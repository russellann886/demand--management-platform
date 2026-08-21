import type { SystemRole } from '../db/roles';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  active: boolean;
  mustChangePassword: boolean;
  roles: SystemRole[];
}

export interface UserIdentity {
  email: string;
  displayName: string;
  subject: string | null;
}

export type AuthVariables = {
  user: AuthUser;
};
