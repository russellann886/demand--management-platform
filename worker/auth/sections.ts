import type { SystemRole } from '../db/roles';

export const SECTION_ADMIN_ROLES: Partial<Record<SystemRole, string>> = {
  admin_goods: '消费券&货品板块',
  admin_coupon: '消费券&货品板块',
  admin_replenish: '追补板块',
  admin_content: '内容场板块',
  admin_shelf: '货架场板块',
  admin_campaign: '大促运营工具包板块',
};
