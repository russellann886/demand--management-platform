/// <reference types="@cloudflare/workers-types" />

import {
  canManageSection,
  hasRole,
  managedSections,
} from '../../worker/auth/permissions';
import { resolveDevelopmentIdentity } from '../../worker/auth/identity';
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from '../../worker/auth/password';
import { isInitialAdmin, parseInitialAdminEmails } from '../../worker/db/roles';

describe('development identity', () => {
  it('never enables the development identity in production', () => {
    expect(
      resolveDevelopmentIdentity({
        APP_ENV: 'production',
        DEV_USER_EMAIL: 'dev@example.com',
      }),
    ).toBeNull();
  });

  it('requires an explicit valid development email', () => {
    expect(
      resolveDevelopmentIdentity({ APP_ENV: 'development' }),
    ).toBeNull();
    expect(
      resolveDevelopmentIdentity({
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

describe('password security', () => {
  it('validates password length and character requirements', () => {
    expect(validatePassword('short1')).not.toBeNull();
    expect(validatePassword('onlyletterslong')).not.toBeNull();
    expect(validatePassword('secure-password-123')).toBeNull();
  });

  it('hashes passwords with a random salt and verifies them', async () => {
    const stored = await hashPassword('secure-password-123');
    expect(stored.hash).not.toContain('secure-password-123');
    await expect(
      verifyPassword('secure-password-123', stored),
    ).resolves.toBe(true);
    await expect(verifyPassword('wrong-password-123', stored)).resolves.toBe(
      false,
    );
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
