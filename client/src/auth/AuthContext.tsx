import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiError,
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from './api';
import {
  SECTION_ADMIN_ROLES,
  type CurrentUser,
  type SystemRole,
} from './types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  error: Error | null;
  hasRole: (...roles: SystemRole[]) => boolean;
  canManageSection: (section: string | null) => boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await getCurrentUser());
    } catch (caught) {
      setUser(null);
      if (caught instanceof ApiError && caught.status === 401) return;
      setError(
        caught instanceof Error ? caught : new Error('无法读取当前用户。'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (...roles: SystemRole[]) =>
      Boolean(
        user &&
        (user.roles.includes('super_admin') ||
          roles.some((role) => user.roles.includes(role))),
      );

    return {
      user,
      loading,
      error,
      hasRole,
      canManageSection: (section) => {
        if (!user) return false;
        if (
          user.roles.includes('super_admin') ||
          user.roles.includes('demand_admin')
        ) {
          return true;
        }
        if (!section) return false;
        return user.roles.some((role) => SECTION_ADMIN_ROLES[role] === section);
      },
      refresh,
      login: async (email, password) => {
        setUser(await loginRequest(email, password));
        setError(null);
      },
      logout: async () => {
        await logoutRequest();
        setUser(null);
      },
      changePassword: async (currentPassword, newPassword) => {
        await changePasswordRequest(currentPassword, newPassword);
        await refresh();
      },
    };
  }, [error, loading, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
