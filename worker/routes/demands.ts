import { Hono } from 'hono';
import { requireRoles } from '../auth/permissions';
import type { AuthVariables } from '../auth/types';
import type { SystemRole } from '../db/roles';
import type { WorkerBindings } from '../db/types';
import { pagination, readJsonObject } from '../http/request';
import {
  createComment,
  createDemand,
  demandDetail,
  listComments,
  listDemands,
  listMyDemands,
  updateDemandAssignee,
  updateDemandScore,
  updateDemandStatus,
} from '../services/demands';

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

routes.get('/demands', async (context) => {
  const { page, pageSize } = pagination(context);
  return context.json(
    await listDemands(
      context.env,
      context.req.query('categoryId') ?? '',
      page,
      pageSize,
    ),
  );
});
routes.get('/demands/my', async (context) =>
  context.json(await listMyDemands(context.env, context.get('user').id)),
);
routes.post('/demands', async (context) =>
  context.json(
    await createDemand(context.env, await readJsonObject(context.req.raw), {
      userId: context.get('user').id,
      external: false,
    }),
  ),
);
routes.get('/demands/:id', async (context) =>
  context.json(await demandDetail(context.env, context.req.param('id'))),
);
routes.get('/demands/:id/comments', async (context) => {
  const { page, pageSize } = pagination(context);
  return context.json(
    await listComments(context.env, context.req.param('id'), page, pageSize),
  );
});
routes.post('/demands/:id/comments', async (context) =>
  context.json(
    await createComment(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.patch('/demands/:id/status', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await updateDemandStatus(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.patch('/demands/:id/score', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await updateDemandScore(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.patch('/demands/:id/assignee', requireRoles(ADMIN_ROLES), async (context) =>
  context.json(
    await updateDemandAssignee(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);

export default routes;
