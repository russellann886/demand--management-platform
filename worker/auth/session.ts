/// <reference types="@cloudflare/workers-types" />

import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createId, toDbTimestamp } from '../db/serialization';
import type { WorkerBindings } from '../db/types';
import { loadAuthUserById } from './identity';
import { createSessionToken, hashSessionToken } from './password';
import type { AuthUser } from './types';

const SESSION_COOKIE = 'dmp_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;

type SessionEnv = {
  Bindings: WorkerBindings;
};

export async function authenticateSession(
  request: Request,
  db: D1Database,
): Promise<AuthUser | null> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  if (!token) return null;

  const now = toDbTimestamp();
  const tokenHash = await hashSessionToken(token);
  const session = await db
    .prepare(
      `SELECT id, user_id, last_seen_at
       FROM app_session
       WHERE access_jti = ?
         AND revoked_at IS NULL
         AND expires_at > ?
       LIMIT 1`,
    )
    .bind(tokenHash, now)
    .first<{ id: string; user_id: string; last_seen_at: string }>();
  if (!session) return null;

  const user = await loadAuthUserById(db, session.user_id);
  if (!user?.active) return null;

  if (Date.now() - Date.parse(session.last_seen_at) > 5 * 60 * 1000) {
    await db
      .prepare(
        `UPDATE app_session
         SET last_seen_at = ?, _updated_at = ?, _updated_by = ?
         WHERE id = ?`,
      )
      .bind(now, now, user.id, session.id)
      .run();
  }

  return user;
}

export async function startSession<Env extends SessionEnv>(
  context: Context<Env>,
  userId: string,
): Promise<void> {
  const token = createSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000);

  await context.env.DB.prepare(
    `INSERT INTO app_session
      (id, user_id, access_jti, expires_at, last_seen_at, user_agent, ip_address,
       _created_by, _updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      createId(),
      userId,
      await hashSessionToken(token),
      toDbTimestamp(expiresAt),
      toDbTimestamp(now),
      context.req.header('user-agent')?.slice(0, 512) ?? null,
      context.req.header('cf-connecting-ip')?.slice(0, 64) ?? null,
      userId,
      userId,
    )
    .run();

  setCookie(context, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: context.env.APP_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession<Env extends SessionEnv>(
  context: Context<Env>,
): Promise<void> {
  const token = getCookie(context, SESSION_COOKIE);
  if (token) {
    const now = toDbTimestamp();
    await context.env.DB.prepare(
      `UPDATE app_session
       SET revoked_at = ?, _updated_at = ?
       WHERE access_jti = ? AND revoked_at IS NULL`,
    )
      .bind(now, now, await hashSessionToken(token))
      .run();
  }
  clearSessionCookie(context);
}

export function clearSessionCookie<Env extends SessionEnv>(
  context: Context<Env>,
): void {
  deleteCookie(context, SESSION_COOKIE, {
    secure: context.env.APP_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
  });
}

function readCookie(header: string | null, name: string): string | null {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=') || null;
  }
  return null;
}
