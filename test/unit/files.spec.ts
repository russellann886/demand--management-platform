/// <reference types="@cloudflare/workers-types" />

import type { MiddlewareHandler } from 'hono';
import type { AuthVariables } from '../../worker/auth/types';
import {
  deserializeAttachment,
  serializeAttachment,
  serializeJson,
} from '../../worker/db/serialization';
import type { WorkerBindings } from '../../worker/db/types';
import {
  createFilesRouter,
  isValidObjectKey,
  validateUpload,
} from '../../worker/routes/files';

type FilesEnv = {
  Bindings: WorkerBindings;
  Variables: AuthVariables;
};

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

describe('KV file routes', () => {
  it('requires Cloudflare Access authentication', async () => {
    const response = await createFilesRouter().request(
      'https://example.com/files/content?key=invalid',
      {},
      createBindings(),
    );

    expect(response.status).toBe(401);
  });

  it('uploads an allowed image to a server-generated owner key', async () => {
    const bindings = createBindings();
    const form = new FormData();
    form.set(
      'file',
      new File([new Uint8Array([137, 80, 78, 71])], 'example.png', {
        type: 'image/png',
      }),
    );
    form.set('purpose', 'image');

    const response = await routerFor(USER_ID).request(
      'https://example.com/files',
      { method: 'POST', body: form },
      bindings,
    );
    const result = (await response.json()) as {
      bucketId: string;
      filePath: string;
      url: string;
    };

    expect(response.status).toBe(201);
    expect(result.bucketId).toBe('kv');
    expect(result.filePath).toMatch(
      new RegExp(`^users/${USER_ID}/images/.+/example\\.png$`),
    );
    expect(result.url).toContain(encodeURIComponent(result.filePath));
    expect(await bindings.FILES.get(result.filePath, 'arrayBuffer')).not.toBeNull();
  });

  it('rejects unsupported and oversized uploads before writing to KV', async () => {
    const files = new MockKVNamespace();
    const invalid = validateUpload(
      { name: 'script.svg', type: 'image/svg+xml', size: 100 },
      'image',
    );
    const oversized = validateUpload(
      { name: 'large.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 },
      'image',
    );

    expect(invalid?.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(oversized?.code).toBe('FILE_TOO_LARGE');
    expect(files.objects.size).toBe(0);
  });

  it('blocks arbitrary keys and permits referenced business attachments', async () => {
    const key = `users/${USER_ID}/rules/33333333-3333-4333-8333-333333333333/rule.pdf`;
    const files = new MockKVNamespace();
    await files.put(key, 'content', {
      metadata: {
        contentType: 'application/pdf',
        ownerId: USER_ID,
        purpose: 'rule',
        originalName: 'rule.pdf',
      },
    });

    const forbidden = await routerFor(OTHER_USER_ID).request(
      `https://example.com/files/content?key=${encodeURIComponent(key)}`,
      {},
      createBindings(files, false),
    );
    const allowed = await routerFor(OTHER_USER_ID).request(
      `https://example.com/files/download?key=${encodeURIComponent(key)}`,
      {},
      createBindings(files, true),
    );

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('content-disposition')).toContain('attachment');
    expect(await allowed.text()).toBe('content');
  });

  it('only deletes current-user orphan objects', async () => {
    const key = `users/${USER_ID}/attachments/33333333-3333-4333-8333-333333333333/notes.txt`;
    const files = new MockKVNamespace();
    await files.put(key, 'notes');

    const inUse = await routerFor(USER_ID).request(
      `https://example.com/files?key=${encodeURIComponent(key)}`,
      { method: 'DELETE' },
      createBindings(files, true),
    );
    const deleted = await routerFor(USER_ID).request(
      `https://example.com/files?key=${encodeURIComponent(key)}`,
      { method: 'DELETE' },
      createBindings(files, false),
    );

    expect(inUse.status).toBe(409);
    expect(deleted.status).toBe(204);
    expect(await files.get(key, 'arrayBuffer')).toBeNull();
  });
});

describe('KV attachment serialization', () => {
  it('stores only the file key and hydrates the compatibility shape', () => {
    const attachment = {
      bucketId: 'legacy-bucket',
      filePath:
        'users/user/images/33333333-3333-4333-8333-333333333333/image.png',
    };

    expect(serializeAttachment(attachment)).toBe(
      `{"fileKey":"${attachment.filePath}"}`,
    );
    expect(deserializeAttachment(`{"fileKey":"${attachment.filePath}"}`)).toEqual(
      { bucketId: 'kv', filePath: attachment.filePath },
    );
    expect(serializeJson({ nested: attachment })).toBe(
      `{"nested":{"fileKey":"${attachment.filePath}"}}`,
    );
  });
});

describe('KV object keys', () => {
  it('accepts generated keys and rejects traversal', () => {
    expect(
      isValidObjectKey(
        `users/${USER_ID}/images/33333333-3333-4333-8333-333333333333/image.png`,
      ),
    ).toBe(true);
    expect(
      isValidObjectKey(`users/${USER_ID}/images/../../private/image.png`),
    ).toBe(false);
  });
});

function routerFor(userId: string) {
  const middleware: MiddlewareHandler<FilesEnv> = async (context, next) => {
    context.set('user', {
      id: userId,
      email: `${userId}@example.com`,
      displayName: userId,
      avatarUrl: null,
      active: true,
      mustChangePassword: false,
      roles: [],
    });
    await next();
  };
  return createFilesRouter(middleware);
}

function createBindings(
  files: MockKVNamespace = new MockKVNamespace(),
  referenced = false,
): WorkerBindings {
  const statement = {
    bind: () => statement,
    first: async () => (referenced ? { found: 1 } : null),
  };
  return {
    APP_ENV: 'production',
    DB: {
      prepare: () => statement,
    } as unknown as D1Database,
    FILES: files as unknown as KVNamespace,
  };
}

class MockKVNamespace {
  readonly objects = new Map<
    string,
    {
      value: ArrayBuffer;
      metadata?: unknown;
    }
  >();

  async put(
    key: string,
    value: string | ArrayBuffer,
    options: KVNamespacePutOptions = {},
  ): Promise<void> {
    const storedValue =
      typeof value === 'string'
        ? new TextEncoder().encode(value).buffer
        : value;
    this.objects.set(key, {
      value: storedValue,
      metadata: options.metadata,
    });
  }

  async get(
    key: string,
    type: 'text' | 'arrayBuffer' | 'stream' = 'text',
  ): Promise<string | ArrayBuffer | ReadableStream | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    if (type === 'arrayBuffer') return stored.value;
    if (type === 'stream') return new Blob([stored.value]).stream();
    return new TextDecoder().decode(stored.value);
  }

  async getWithMetadata(
    key: string,
    _type: 'arrayBuffer',
  ): Promise<{ value: ArrayBuffer | null; metadata: unknown }> {
    const stored = this.objects.get(key);
    return {
      value: stored?.value ?? null,
      metadata: stored?.metadata ?? null,
    };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
