import { Hono } from 'hono';
import { requireRoles } from '../auth/permissions';
import type { AuthVariables } from '../auth/types';
import type { SystemRole } from '../db/roles';
import type { WorkerBindings } from '../db/types';
import { readJsonObject } from '../http/request';
import { getMergeSuggestions } from '../services/ai-merge';

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
routes.use('/ai/*', requireRoles(ADMIN_ROLES));

routes.post('/ai/merge-suggestions', async (context) =>
  context.json(
    await getMergeSuggestions(
      context.env,
      context.get('user'),
      await readJsonObject(context.req.raw),
    ),
  ),
);

export default routes;
