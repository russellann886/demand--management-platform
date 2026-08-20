import { useAuth } from '@/auth/AuthContext';
import { SECTION_ADMIN_ROLES } from '@shared/api.interface';

interface UseUserSectionsResult {
  sections: string[] | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

export function useUserSections(): UseUserSectionsResult {
  const { user, loading } = useAuth();

  if (loading) {
    return { sections: [], isSuperAdmin: false, isLoading: true };
  }

  if (
    user?.roles.includes('super_admin') ||
    user?.roles.includes('demand_admin')
  ) {
    return { sections: null, isSuperAdmin: true, isLoading: false };
  }

  const sections = Object.entries(SECTION_ADMIN_ROLES)
    .filter(([role]) => user?.roles.some((userRole) => userRole === role))
    .map(([, section]) => section);

  return { sections, isSuperAdmin: false, isLoading: false };
}
