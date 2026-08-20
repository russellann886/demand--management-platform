import { Hono } from 'hono';
import { requireRoles } from '../auth/permissions';
import type { AuthVariables } from '../auth/types';
import type { SystemRole } from '../db/roles';
import type { WorkerBindings } from '../db/types';
import { readJsonObject } from '../http/request';
import {
  addMergedSources,
  createMergedDemand,
  deleteMergedDemand,
  listMergedDemands,
  listSourceDemands,
  releaseMergedSource,
  updateMergedDemand,
} from '../services/merged-demands';

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
routes.use('/merged-demands/*', requireRoles(ADMIN_ROLES));
routes.use('/merged-demands', requireRoles(ADMIN_ROLES));

routes.get('/merged-demands/source-demands', async (context) =>
  context.json(
    await listSourceDemands(
      context.env,
      context.get('user'),
      context.req.query('categoryId') ?? '',
    ),
  ),
);
routes.get('/merged-demands', async (context) =>
  context.json(
    await listMergedDemands(
      context.env,
      context.get('user'),
      context.req.query('categoryId') ?? '',
    ),
  ),
);
routes.post('/merged-demands', async (context) =>
  context.json(
    await createMergedDemand(
      context.env,
      context.get('user'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.put('/merged-demands/:id', async (context) =>
  context.json(
    await updateMergedDemand(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.delete('/merged-demands/:id', async (context) =>
  context.json(
    await deleteMergedDemand(
      context.env,
      context.get('user'),
      context.req.param('id'),
    ),
  ),
);
routes.post('/merged-demands/:id/sources', async (context) =>
  context.json(
    await addMergedSources(
      context.env,
      context.get('user'),
      context.req.param('id'),
      await readJsonObject(context.req.raw),
    ),
  ),
);
routes.delete('/merged-demands/:id/sources/:demandId', async (context) =>
  context.json(
    await releaseMergedSource(
      context.env,
      context.get('user'),
      context.req.param('id'),
      context.req.param('demandId'),
    ),
  ),
);

export default routes;
