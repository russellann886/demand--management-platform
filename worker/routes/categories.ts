import { Hono } from 'hono';
import { requireRoles } from '../auth/permissions';
import type { AuthVariables } from '../auth/types';
import type { SystemRole } from '../db/roles';
import type { WorkerBindings } from '../db/types';
import { readJsonObject } from '../http/request';
import {
  createCategory,
  getBoardAdmins,
  getCategories,
  updateCategory,
} from '../services/categories';

type Env = { Bindings: WorkerBindings; Variables: AuthVariables };
const ADMIN_ROLES: SystemRole[] = [
  'demand_admin',
  'admin_goods',
  'admin_coupon',
  'admin_replenish',
  'admin_content',
  'admin_shelf',
  'admin_campaign',
];
const routes = new Hono<Env>();

routes.get('/demand-categories', async (context) =>
  context.json(await getCategories(context.env, true)),
);
routes.get('/demand-categories/all', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(await getCategories(context.env, false, context.get('user'))),
);
routes.get(
  '/demand-categories/board-admins',
  requireRoles(ADMIN_ROLES),
  async (context) => context.json(await getBoardAdmins(context.env)),
);
routes.post('/demand-categories', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await createCategory(
      context.env,
      context.get('user'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.put('/demand-categories/:id', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await updateCategory(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);

export default routes;
