export const SYSTEM_ROLES = [
  'super_admin',
  'demand_admin',
  'admin_goods',
  'admin_coupon',
  'admin_replenish',
  'admin_content',
  'admin_shelf',
  'admin_campaign',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  roles: SystemRole[];
}

export interface ManagedUser extends CurrentUser {
  active: boolean;
  lastSeenAt: string | null;
  hasPassword: boolean;
}

export interface RoleDefinition {
  code: SystemRole;
  name: string;
  description: string;
  section: string | null;
}

export const SECTION_ADMIN_ROLES: Partial<Record<SystemRole, string>> = {
  admin_goods: '消费券&货品板块',
  admin_coupon: '消费券&货品板块',
  admin_replenish: '追补板块',
  admin_content: '内容场板块',
  admin_shelf: '货架场板块',
  admin_campaign: '大促运营工具包板块',
};
