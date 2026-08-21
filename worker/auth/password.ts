const DEFAULT_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export type PasswordHash = {
  hash: string;
  salt: string;
  iterations: number;
};

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') {
    return '密码不能为空。';
  }
  if (password.length < 12) {
    return '密码至少需要 12 个字符。';
  }
  if (password.length > 128) {
    return '密码不能超过 128 个字符。';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return '密码必须同时包含字母和数字。';
  }
  return null;
}

export async function hashPassword(
  password: string,
  salt = randomBytes(SALT_BYTES),
  iterations = DEFAULT_ITERATIONS,
): Promise<PasswordHash> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt.buffer.slice(
        salt.byteOffset,
        salt.byteOffset + salt.byteLength,
      ) as ArrayBuffer,
      iterations,
    },
    key,
    HASH_BYTES * 8,
  );

  return {
    hash: encodeBase64Url(new Uint8Array(derived)),
    salt: encodeBase64Url(salt),
    iterations,
  };
}

export async function verifyPassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  const candidate = await hashPassword(
    password,
    decodeBase64Url(stored.salt),
    stored.iterations,
  );
  return constantTimeEqual(candidate.hash, stored.hash);
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

export function createSessionToken(): string {
  return encodeBase64Url(randomBytes(32));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    difference |=
      (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}
