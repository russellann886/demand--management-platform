/// <reference types="@cloudflare/workers-types" />

import { readFileSync } from 'node:fs';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import app from '../../worker';
import type { WorkerBindings } from '../../worker/db/types';

describe('Cloudflare business API', () => {
  let dispose: (() => Promise<void>) | undefined;
  let db: D1Database;
  let files: R2Bucket;
  let env: WorkerBindings;

  beforeAll(async () => {
    const proxy = await getPlatformProxy<WorkerBindings>({
      configPath: 'test/fixtures/wrangler.api-test.toml',
      envFiles: ['../../.dev.vars.example'],
      persist: false,
      remoteBindings: false,
    });
    dispose = proxy.dispose;
    db = proxy.env.DB;
    files = proxy.env.FILES;
    const migration = readFileSync('migrations/0001_initial.sql', 'utf8');
    await db.batch(
      unstable_splitSqlQuery(migration).map((statement) =>
        db.prepare(statement),
      ),
    );
    env = {
      APP_ENV: 'development',
      DEV_USER_EMAIL: 'admin@example.com',
      DEV_USER_NAME: 'Admin',
      SUPER_ADMIN_EMAILS: 'admin@example.com',
      OPENAPI_DEMAND_TOKEN: 'external-secret',
      DB: db,
      FILES: files,
    };
  });

  afterAll(async () => {
    await dispose?.();
  });

  it('runs the core API contracts and authorization rules', async () => {
    const health = await request('/api/health', {}, {
      ...env,
      APP_ENV: 'production',
    });
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    });

    const unauthorized = await request('/api/demands?categoryId=missing', {}, {
      ...env,
      APP_ENV: 'production',
      DEV_USER_EMAIL: undefined,
    });
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toMatchObject({
      error: { code: 'AUTH_REQUIRED' },
    });

    const category = await jsonRequest('/api/demand-categories', 'POST', {
      name: '测试栏目',
      description: 'Task 4 API test',
      section: '追补板块',
      departments: ['运营'],
    });
    expect(category.status).toBe(200);
    const categoryId = (await category.json() as { id: string }).id;
    const updatedCategory = await jsonRequest(
      `/api/demand-categories/${categoryId}`,
      'PUT',
      {
        name: '测试栏目（更新）',
        description: '栏目更新测试',
        enabled: true,
        departments: ['运营', '产品'],
      },
    );
    expect(updatedCategory.status).toBe(200);
    await expect(request('/api/demand-categories')).resolves.toMatchObject({
      status: 200,
    });
    await expect(
      (await request('/api/demand-categories')).json(),
    ).resolves.toMatchObject({
      items: [
        {
          id: categoryId,
          name: '测试栏目（更新）',
          departments: ['运营', '产品'],
          enabled: true,
        },
      ],
    });

    const demandIds: string[] = [];
    for (const title of ['需求一', '需求二', '需求三']) {
      const response = await jsonRequest('/api/demands', 'POST', {
        categoryId,
        title,
        background: '背景',
        department: '运营',
        image: null,
        valueType: null,
        gmvLevel: null,
        efficiencyAffected: null,
        efficiencySavedMinutes: null,
        expectedOnlineTime: null,
        demandType: null,
        isBlocking: null,
        priority: null,
      });
      expect(response.status).toBe(200);
      demandIds.push((await response.json() as { id: string }).id);
    }

    const page = await request(
      `/api/demands?categoryId=${categoryId}&page=1&pageSize=2`,
    );
    expect(page.status).toBe(200);
    await expect(page.json()).resolves.toMatchObject({
      total: 3,
      items: [{ title: '需求三' }, { title: '需求二' }],
    });
    await expect(
      (await request(`/api/demands/${demandIds[0]}`)).json(),
    ).resolves.toMatchObject({
      id: demandIds[0],
      title: '需求一',
      background: '背景',
      section: '追补板块',
    });

    const normalEnv = {
      ...env,
      DEV_USER_EMAIL: 'user@example.com',
      DEV_USER_NAME: 'User',
      SUPER_ADMIN_EMAILS: '',
    };
    const forbiddenCategory = await jsonRequest(
      `/api/demand-categories/${categoryId}`,
      'PUT',
      { name: '越权更新' },
      normalEnv,
    );
    expect(forbiddenCategory.status).toBe(403);

    const comment = await jsonRequest(
      `/api/demands/${demandIds[0]}/comments`,
      'POST',
      { content: '普通用户评论' },
      normalEnv,
    );
    expect(comment.status).toBe(200);
    const comments = await request(
      `/api/demands/${demandIds[0]}/comments?page=1&pageSize=10`,
    );
    await expect(comments.json()).resolves.toMatchObject({
      total: 1,
      items: [{ content: '普通用户评论' }],
    });

    const forbiddenStatus = await jsonRequest(
      `/api/demands/${demandIds[0]}/status`,
      'PATCH',
      { status: '已完成' },
      normalEnv,
    );
    expect(forbiddenStatus.status).toBe(403);

    const forbiddenAi = await jsonRequest(
      '/api/ai/merge-suggestions',
      'POST',
      { categoryId },
      normalEnv,
    );
    expect(forbiddenAi.status).toBe(403);

    const unconfiguredAi = await jsonRequest(
      '/api/ai/merge-suggestions',
      'POST',
      { categoryId },
    );
    expect(unconfiguredAi.status).toBe(503);
    await expect(unconfiguredAi.json()).resolves.toMatchObject({
      error: { code: 'AI_NOT_CONFIGURED' },
    });

    const normalUser = await db
      .prepare('SELECT id FROM app_user WHERE email = ?')
      .bind('user@example.com')
      .first<{ id: string }>();
    expect(normalUser).not.toBeNull();
    await db
      .prepare('INSERT INTO user_role (user_id, role_code) VALUES (?, ?)')
      .bind(normalUser!.id, 'admin_replenish')
      .run();
    const assign = await jsonRequest(
      `/api/demands/${demandIds[0]}/assignee`,
      'PATCH',
      { assignee: normalUser!.id },
      normalEnv,
    );
    expect(assign.status).toBe(200);
    const followUp = await jsonRequest(
      `/api/demands/${demandIds[0]}/status`,
      'PATCH',
      { status: '跟进中', plannedSchedule: '2026-09-01' },
      normalEnv,
    );
    expect(followUp.status).toBe(200);
    const clearAssignee = await jsonRequest(
      `/api/demands/${demandIds[0]}/assignee`,
      'PATCH',
      { assignee: null },
      normalEnv,
    );
    expect(clearAssignee.status).toBe(200);
    await expect(
      db
        .prepare('SELECT assignee, status FROM demand WHERE id = ?')
        .bind(demandIds[0])
        .first<{ assignee: string | null; status: string }>(),
    ).resolves.toMatchObject({ assignee: null, status: '待处理' });

    const noAssignee = await jsonRequest(
      `/api/demands/${demandIds[0]}/status`,
      'PATCH',
      { status: '跟进中' },
    );
    expect(noAssignee.status).toBe(400);
    await expect(noAssignee.json()).resolves.toMatchObject({
      error: { code: 'ASSIGNEE_REQUIRED' },
    });
    const invalidStatus = await jsonRequest(
      `/api/demands/${demandIds[0]}/status`,
      'PATCH',
      { status: '未知状态' },
      normalEnv,
    );
    expect(invalidStatus.status).toBe(400);
    const scored = await jsonRequest(
      `/api/demands/${demandIds[0]}/score`,
      'PATCH',
      { manualScore: 88 },
      normalEnv,
    );
    expect(scored.status).toBe(200);

    const merged = await jsonRequest('/api/merged-demands', 'POST', {
      categoryId,
      title: '整合需求',
      reason: '同类问题',
      demandIds: demandIds.slice(0, 2),
    });
    expect(merged.status).toBe(200);
    const mergedId = (await merged.json() as { id: string }).id;
    const updatedMerged = await jsonRequest(
      `/api/merged-demands/${mergedId}`,
      'PUT',
      {
        title: '整合需求（更新）',
        assignee: normalUser!.id,
        status: '跟进中',
        manualScore: 99,
        plannedSchedule: '2026-10-01',
      },
      normalEnv,
    );
    expect(updatedMerged.status).toBe(200);
    await expect(
      (await request(`/api/merged-demands?categoryId=${categoryId}`)).json(),
    ).resolves.toMatchObject({
      items: [
        {
          id: mergedId,
          title: '整合需求（更新）',
          status: '跟进中',
          assignee: normalUser!.id,
          manualScore: 99,
        },
      ],
    });
    const added = await jsonRequest(
      `/api/merged-demands/${mergedId}/sources`,
      'POST',
      { demandIds: [demandIds[2]] },
    );
    expect(added.status).toBe(200);
    const released = await request(
      `/api/merged-demands/${mergedId}/sources/${demandIds[0]}`,
      { method: 'DELETE' },
    );
    await expect(released.json()).resolves.toEqual({
      id: mergedId,
      dissolved: false,
    });
    const dissolved = await request(
      `/api/merged-demands/${mergedId}/sources/${demandIds[1]}`,
      { method: 'DELETE' },
    );
    await expect(dissolved.json()).resolves.toEqual({
      id: mergedId,
      dissolved: true,
    });
    const mergedList = await request(
      `/api/merged-demands?categoryId=${categoryId}`,
    );
    await expect(mergedList.json()).resolves.toEqual({ items: [] });

    const application = await jsonRequest('/api/rules', 'POST', {
      name: '加白申请',
      type: '加白',
      section: 'replenish',
      content: '申请内容',
      reason: '业务需要',
    }, normalEnv);
    expect(application.status).toBe(200);
    const ruleId = (await application.json() as { id: string }).id;
    const reviewed = await jsonRequest(`/api/rules/${ruleId}/status`, 'PATCH', {
      status: '已通过',
      reviewFeedback: '同意',
    });
    expect(reviewed.status).toBe(200);
    await expect(
      (await request(`/api/rules/${ruleId}`)).json(),
    ).resolves.toMatchObject({
      id: ruleId,
      status: '已通过',
      reviewFeedback: '同意',
    });
    const repeatedReview = await jsonRequest(
      `/api/rules/${ruleId}/status`,
      'PATCH',
      { status: '已驳回' },
    );
    expect(repeatedReview.status).toBe(400);
    await expect(repeatedReview.json()).resolves.toMatchObject({
      error: { code: 'RULE_ALREADY_REVIEWED' },
    });

    const published = await jsonRequest('/api/rules', 'POST', {
      name: '追补规则',
      type: '规则',
      section: 'replenish',
      content: '规则内容',
    });
    const publishedId = (await published.json() as { id: string }).id;
    expect(
      await jsonRequest(`/api/rules/${publishedId}`, 'PUT', {
        name: '追补规则（更新）',
      }),
    ).toMatchObject({ status: 200 });
    await expect(
      (await request('/api/rules?section=replenish&type=规则')).json(),
    ).resolves.toMatchObject({
      total: 1,
      items: [{ id: publishedId, name: '追补规则（更新）' }],
    });
    expect(
      await request(`/api/rules/${publishedId}`, { method: 'DELETE' }),
    ).toMatchObject({ status: 200 });

    const missingToken = await jsonRequest(
      '/openapi/demands',
      'POST',
      { categoryId, title: '外部需求', background: '外部背景' },
      env,
      {},
    );
    expect(missingToken.status).toBe(401);
    const external = await jsonRequest(
      '/openapi/demands',
      'POST',
      { categoryId, title: '外部需求', background: '外部背景' },
      env,
      { authorization: 'Bearer external-secret' },
    );
    expect(external.status).toBe(200);
  });

  function request(
    path: string,
    init: RequestInit = {},
    bindings: WorkerBindings = env,
  ) {
    return app.request(`http://localhost${path}`, init, bindings);
  }

  function jsonRequest(
    path: string,
    method: string,
    body: Record<string, unknown>,
    bindings: WorkerBindings = env,
    headers: Record<string, string> = {},
  ) {
    return request(
      path,
      {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      },
      bindings,
    );
  }
});
