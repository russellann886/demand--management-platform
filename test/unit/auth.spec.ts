/// <reference types="@cloudflare/workers-types" />

import {
  canManageSection,
  hasRole,
  managedSections,
} from '../../worker/auth/permissions';
import { resolveAccessIdentity } from '../../worker/auth/identity';
import { isInitialAdmin, parseInitialAdminEmails } from '../../worker/db/roles';

describe('Cloudflare Access identity', () => {
  it('uses and normalizes the trusted Access email header', () => {
    const request = new Request('https://example.com/api/auth/me', {
      headers: {
        'cf-access-authenticated-user-email': ' User@Example.COM ',
        'cf-access-jwt-assertion': createUnsignedJwt({
          sub: 'access-subject',
          name: '测试用户',
        }),
      },
    });

    expect(
      resolveAccessIdentity(request, {
        APP_ENV: 'production',
        DEV_USER_EMAIL: 'dev@example.com',
      }),
    ).toEqual({
      email: 'user@example.com',
      displayName: '测试用户',
      subject: 'access-subject',
    });
  });

  it('never falls back to development identity in production', () => {
    expect(
      resolveAccessIdentity(new Request('https://example.com'), {
        APP_ENV: 'production',
        DEV_USER_EMAIL: 'dev@example.com',
        DEV_USER_NAME: 'Developer',
      }),
    ).toBeNull();
  });

  it('requires an explicit valid development email', () => {
    const request = new Request('http://localhost:8787/api/auth/me');

    expect(
      resolveAccessIdentity(request, { APP_ENV: 'development' }),
    ).toBeNull();
    expect(
      resolveAccessIdentity(request, {
        APP_ENV: 'development',
        DEV_USER_EMAIL: 'developer@example.com',
        DEV_USER_NAME: 'Local Developer',
      }),
    ).toEqual({
      email: 'developer@example.com',
      displayName: 'Local Developer',
      subject: null,
    });
  });
});

describe('role authorization', () => {
  it('allows super administrators to pass every role check', () => {
    expect(hasRole(['super_admin'], ['demand_admin'])).toBe(true);
    expect(canManageSection(['super_admin'], null)).toBe(true);
  });

  it('preserves demand_admin global management semantics', () => {
    expect(managedSections(['demand_admin'])).toBeNull();
    expect(canManageSection(['demand_admin'], '追补板块')).toBe(true);
  });

  it('limits section administrators to their mapped sections', () => {
    expect(managedSections(['admin_coupon'])).toEqual(['消费券&货品板块']);
    expect(canManageSection(['admin_coupon'], '消费券&货品板块')).toBe(true);
    expect(canManageSection(['admin_coupon'], '追补板块')).toBe(false);
    expect(hasRole([], ['demand_admin'])).toBe(false);
  });
});

describe('super administrator seed configuration', () => {
  it('normalizes, validates and de-duplicates configured emails', () => {
    expect([
      ...parseInitialAdminEmails(
        ' Admin@Example.com,invalid,admin@example.com',
      ),
    ]).toEqual(['admin@example.com']);
    expect(isInitialAdmin('ADMIN@example.com', 'admin@example.com')).toBe(true);
  });
});

function createUnsignedJwt(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}
