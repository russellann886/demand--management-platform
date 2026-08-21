/// <reference types="@cloudflare/workers-types" />

import { readFileSync } from 'node:fs';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import app from '../../worker';
import { hashPassword } from '../../worker/auth/password';
import type { WorkerBindings } from '../../worker/db/types';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_EMAIL = 'admin@example.com';
const INITIAL_PASSWORD = 'Initial-password-123';
const NEXT_PASSWORD = 'Updated-password-456';

describe('password authentication', () => {
  let dispose: (() => Promise<void>) | undefined;
  let env: WorkerBindings;

  beforeAll(async () => {
    const proxy = await getPlatformProxy<WorkerBindings>({
      configPath: 'test/fixtures/wrangler.api-test.toml',
      envFiles: ['../../.dev.vars.example'],
      persist: false,
      remoteBindings: false,
    });
    dispose = proxy.dispose;
    const migration = [
      readFileSync('migrations/0001_initial.sql', 'utf8'),
      readFileSync('migrations/0002_password_auth.sql', 'utf8'),
    ].join('\n');
    await proxy.env.DB.batch(
      unstable_splitSqlQuery(migration).map((statement) =>
        proxy.env.DB.prepare(statement),
      ),
    );
    env = {
      APP_ENV: 'production',
      DB: proxy.env.DB,
      FILES: proxy.env.FILES,
    };

    const password = await hashPassword(INITIAL_PASSWORD);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO app_user
          (id, email, display_name, active, _created_by, _updated_by)
         VALUES (?, ?, ?, 1, ?, ?)`,
      ).bind(ADMIN_ID, ADMIN_EMAIL, 'Admin', ADMIN_ID, ADMIN_ID),
      env.DB.prepare(
        `INSERT INTO app_credential
          (user_id, password_hash, password_salt, password_iterations,
           must_change_password, _created_by, _updated_by)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
      ).bind(
        ADMIN_ID,
        password.hash,
        password.salt,
        password.iterations,
        ADMIN_ID,
        ADMIN_ID,
      ),
      env.DB.prepare(
        `INSERT INTO user_role
          (user_id, role_code, _created_by, _updated_by)
         VALUES (?, 'super_admin', ?, ?)`,
      ).bind(ADMIN_ID, ADMIN_ID, ADMIN_ID),
    ]);
  });

  afterAll(async () => {
    await dispose?.();
  });

  it('logs in, changes a temporary password and logs out', async () => {
    const rejected = await login(ADMIN_EMAIL, 'incorrect-password-123');
    expect(rejected.status).toBe(401);

    const signedIn = await login(ADMIN_EMAIL, INITIAL_PASSWORD);
    expect(signedIn.status).toBe(200);
    await expect(signedIn.clone().json()).resolves.toMatchObject({
      user: {
        email: ADMIN_EMAIL,
        roles: ['super_admin'],
        mustChangePassword: true,
      },
    });
    const initialCookie = sessionCookie(signedIn);
    expect(signedIn.headers.get('set-cookie')).toContain('HttpOnly');
    expect(signedIn.headers.get('set-cookie')).toContain('SameSite=Strict');

    const me = await request('/api/auth/me', {}, initialCookie);
    expect(me.status).toBe(200);
    const blockedUntilChanged = await request(
      '/api/admin/users',
      {},
      initialCookie,
    );
    expect(blockedUntilChanged.status).toBe(403);
    await expect(blockedUntilChanged.json()).resolves.toMatchObject({
      error: { code: 'PASSWORD_CHANGE_REQUIRED' },
    });

    const changed = await request(
      '/api/auth/change-password',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: INITIAL_PASSWORD,
          newPassword: NEXT_PASSWORD,
        }),
      },
      initialCookie,
    );
    expect(changed.status).toBe(200);
    const nextCookie = sessionCookie(changed);

    expect((await login(ADMIN_EMAIL, INITIAL_PASSWORD)).status).toBe(401);
    const nextLogin = await login(ADMIN_EMAIL, NEXT_PASSWORD);
    expect(nextLogin.status).toBe(200);
    await expect(nextLogin.json()).resolves.toMatchObject({
      user: { mustChangePassword: false },
    });

    const loggedOut = await request(
      '/api/auth/logout',
      { method: 'POST' },
      nextCookie,
    );
    expect(loggedOut.status).toBe(204);
    expect((await request('/api/auth/me', {}, nextCookie)).status).toBe(401);
  });

  it('lets a super administrator create an account with a temporary password', async () => {
    const signedIn = await login(ADMIN_EMAIL, NEXT_PASSWORD);
    const cookie = sessionCookie(signedIn);
    const created = await request(
      '/api/admin/users',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          displayName: 'Test User',
          password: 'Temporary-password-789',
          roles: [],
        }),
      },
      cookie,
    );
    expect(created.status).toBe(201);

    const userLogin = await login(
      'user@example.com',
      'Temporary-password-789',
    );
    expect(userLogin.status).toBe(200);
    await expect(userLogin.json()).resolves.toMatchObject({
      user: {
        email: 'user@example.com',
        roles: [],
        mustChangePassword: true,
      },
    });
  });

  function login(email: string, password: string) {
    return request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }

  function request(
    path: string,
    init: RequestInit = {},
    cookie?: string,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    if (cookie) headers.set('cookie', cookie);
    return Promise.resolve(
      app.request(
        `https://example.com${path}`,
        { ...init, headers },
        env,
      ),
    );
  }
});

function sessionCookie(response: Response): string {
  const value = response.headers.get('set-cookie');
  if (!value) throw new Error('Session cookie missing');
  return value.split(';')[0];
}
