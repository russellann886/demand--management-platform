import { randomBytes, webcrypto } from 'node:crypto';

const ITERATIONS = 100_000;
const password = (await readStdin()).replace(/\r?\n$/, '');

if (
  password.length < 12 ||
  password.length > 128 ||
  !/[A-Za-z]/.test(password) ||
  !/\d/.test(password)
) {
  throw new Error(
    'Password must be 12-128 characters and contain letters and numbers.',
  );
}

const salt = randomBytes(16);
const key = await webcrypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  'PBKDF2',
  false,
  ['deriveBits'],
);
const hash = await webcrypto.subtle.deriveBits(
  {
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations: ITERATIONS,
  },
  key,
  256,
);

process.stdout.write(
  JSON.stringify({
    hash: Buffer.from(hash).toString('base64url'),
    salt: salt.toString('base64url'),
    iterations: ITERATIONS,
  }),
);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}
