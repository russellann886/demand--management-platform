import { useAuth, ROLE_SUBJECT } from '@lark-apaas/client-toolkit/auth';
import { SECTION_ADMIN_ROLES } from '@shared/api.interface';

interface UseUserSectionsResult {
  sections: string[] | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

export function useUserSections(): UseUserSectionsResult {
  const { ability, isLoading } = useAuth();

  if (isLoading) {
    return { sections: [], isSuperAdmin: false, isLoading: true };
  }

  if (ability.can('demand_admin', ROLE_SUBJECT)) {
    return { sections: null, isSuperAdmin: true, isLoading: false };
  }

  const sections = Object.entries(SECTION_ADMIN_ROLES)
    .filter(([role]) => ability.can(role, ROLE_SUBJECT))
    .map(([, section]) => section);

  return { sections, isSuperAdmin: false, isLoading: false };
}
