import { SECTION_ADMIN_ROLES, RULE_SECTIONS } from '@shared/api.interface';

export function getUserSections(roles: string[] | undefined): string[] | null {
  if (!roles) return null;
  if (roles.includes('demand_admin')) return null;
  return roles
    .filter((r) => r in SECTION_ADMIN_ROLES)
    .map((r) => SECTION_ADMIN_ROLES[r]);
}

export function hasSectionAccess(
  section: string | null,
  userSections: string[] | null,
): boolean {
  if (userSections === null) return true;
  if (section === null) return false;
  return userSections.includes(section);
}

export function canManageRuleSection(
  ruleSectionKey: string,
  roles: string[] | undefined,
): boolean {
  if (!roles) return true;
  if (roles.includes('demand_admin')) return true;
  const sectionDef = RULE_SECTIONS.find((s) => s.key === ruleSectionKey);
  if (!sectionDef) return false;
  return roles.includes(sectionDef.adminRole);
}
