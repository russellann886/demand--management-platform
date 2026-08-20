import { Hono } from 'hono';
import { requireAuth } from './auth/permissions';
import type { AuthVariables } from './auth/types';
import type { WorkerBindings } from './db/types';
import { errorResponse } from './http/errors';
import { ApiError, readJsonObject } from './http/request';
import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import demandRoutes from './routes/demands';
import filesRoutes from './routes/files';
import mergedDemandRoutes from './routes/merged-demands';
import ruleRoutes from './routes/rules';
import { createDemand } from './services/demands';

type Env = {
  Bindings: WorkerBindings;
  Variables: AuthVariables;
};

const app = new Hono<Env>();

app.get('/api/health', async (context) => {
  await context.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  return context.json({ status: 'ok', database: 'ok' });
});

app.post('/openapi/demands', async (context) => {
  const configuredToken = context.env.OPENAPI_DEMAND_TOKEN?.trim();
  if (!configuredToken) {
    throw new ApiError(
      503,
      'OPENAPI_NOT_CONFIGURED',
      '外部需求接口尚未配置',
    );
  }
  const authorization = context.req.header('authorization') ?? '';
  const suppliedToken = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : context.req.header('x-api-token')?.trim() ?? '';
  if (!(await tokensEqual(configuredToken, suppliedToken))) {
    throw new ApiError(401, 'INVALID_API_TOKEN', 'API token无效');
  }
  return context.json(
    await createDemand(context.env, await readJsonObject(context.req.raw), {
      userId: null,
      external: true,
    }),
  );
});

app.use('/api/*', requireAuth);
app.route('/api', aiRoutes);
app.route('/api', authRoutes);
app.route('/api', categoryRoutes);
app.route('/api', demandRoutes);
app.route('/api', mergedDemandRoutes);
app.route('/api', ruleRoutes);
app.route('/api', filesRoutes);

app.notFound((context) =>
  errorResponse(context, 404, 'NOT_FOUND', '请求的资源不存在'),
);

app.onError((error, context) => {
  if (error instanceof ApiError) {
    return errorResponse(
      context,
      error.status,
      error.code,
      error.message,
      error.details,
    );
  }
  console.error('Unhandled API error', error);
  const message = error instanceof Error ? error.message : '';
  if (
    message.includes('FOREIGN KEY constraint failed') ||
    message.includes('UNIQUE constraint failed')
  ) {
    return errorResponse(
      context,
      409,
      'DATABASE_CONSTRAINT',
      '请求与现有数据约束冲突',
    );
  }
  return errorResponse(
    context,
    500,
    'INTERNAL_ERROR',
    '服务器内部错误',
  );
});

async function tokensEqual(expected: string, supplied: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [expectedHash, suppliedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
  ]);
  const left = new Uint8Array(expectedHash);
  const right = new Uint8Array(suppliedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export default app;
