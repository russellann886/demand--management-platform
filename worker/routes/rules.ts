import { Hono } from 'hono';
import { requireRoles } from '../auth/permissions';
import type { AuthVariables } from '../auth/types';
import type { SystemRole } from '../db/roles';
import type { WorkerBindings } from '../db/types';
import { pagination, readJsonObject } from '../http/request';
import {
  createRule,
  deleteRule,
  listRules,
  reviewRule,
  ruleDetail,
  updateRule,
} from '../services/rules';

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

routes.get('/rules', async (context) => {
  const { page, pageSize } = pagination(context);
  return context.json(
    await listRules(context.env, context.get('user'), {
      section: context.req.query('section'),
      type: context.req.query('type'),
      status: context.req.query('status'),
      creator: context.req.query('creator'),
      page,
      pageSize,
    }),
  );
});
routes.get('/rules/:id', async (context) =>
  context.json(await ruleDetail(context.env, context.req.param('id'))),
);
routes.post('/rules', async (context) =>
  context.json(
    await createRule(
      context.env,
      context.get('user'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.put('/rules/:id', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await updateRule(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.delete('/rules/:id', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await deleteRule(context.env, context.get('user'), context.req.param('id')),
  ),
);
routes.patch('/rules/:id/status', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await reviewRule(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);

export default routes;
