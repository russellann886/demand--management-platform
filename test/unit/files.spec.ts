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

describe('R2 file routes', () => {
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
    expect(result.bucketId).toBe('r2');
    expect(result.filePath).toMatch(
      new RegExp(`^users/${USER_ID}/images/.+/example\\.png$`),
    );
    expect(result.url).toContain(encodeURIComponent(result.filePath));
    expect(await bindings.FILES.head(result.filePath)).not.toBeNull();
  });

  it('rejects unsupported and oversized uploads before writing to R2', async () => {
    const r2 = new MockR2Bucket();
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
    expect(r2.objects.size).toBe(0);
  });

  it('blocks arbitrary keys and permits referenced business attachments', async () => {
    const key = `users/${USER_ID}/rules/33333333-3333-4333-8333-333333333333/rule.pdf`;
    const r2 = new MockR2Bucket();
    await r2.put(key, 'content', {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: { ownerId: USER_ID, originalName: 'rule.pdf' },
    });

    const forbidden = await routerFor(OTHER_USER_ID).request(
      `https://example.com/files/content?key=${encodeURIComponent(key)}`,
      {},
      createBindings(r2, false),
    );
    const allowed = await routerFor(OTHER_USER_ID).request(
      `https://example.com/files/download?key=${encodeURIComponent(key)}`,
      {},
      createBindings(r2, true),
    );

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('content-disposition')).toContain('attachment');
    expect(await allowed.text()).toBe('content');
  });

  it('only deletes current-user orphan objects', async () => {
    const key = `users/${USER_ID}/attachments/33333333-3333-4333-8333-333333333333/notes.txt`;
    const r2 = new MockR2Bucket();
    await r2.put(key, 'notes');

    const inUse = await routerFor(USER_ID).request(
      `https://example.com/files?key=${encodeURIComponent(key)}`,
      { method: 'DELETE' },
      createBindings(r2, true),
    );
    const deleted = await routerFor(USER_ID).request(
      `https://example.com/files?key=${encodeURIComponent(key)}`,
      { method: 'DELETE' },
      createBindings(r2, false),
    );

    expect(inUse.status).toBe(409);
    expect(deleted.status).toBe(204);
    expect(await r2.head(key)).toBeNull();
  });
});

describe('R2 attachment serialization', () => {
  it('stores only the R2 key and hydrates the compatibility shape', () => {
    const attachment = {
      bucketId: 'legacy-bucket',
      filePath:
        'users/user/images/33333333-3333-4333-8333-333333333333/image.png',
    };

    expect(serializeAttachment(attachment)).toBe(
      `{"r2Key":"${attachment.filePath}"}`,
    );
    expect(deserializeAttachment(`{"r2Key":"${attachment.filePath}"}`)).toEqual(
      { bucketId: 'r2', filePath: attachment.filePath },
    );
    expect(serializeJson({ nested: attachment })).toBe(
      `{"nested":{"r2Key":"${attachment.filePath}"}}`,
    );
  });
});

describe('R2 object keys', () => {
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
      roles: [],
    });
    await next();
  };
  return createFilesRouter(middleware);
}

function createBindings(
  r2: MockR2Bucket = new MockR2Bucket(),
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
    FILES: r2 as unknown as R2Bucket,
  };
}

class MockR2Bucket {
  readonly objects = new Map<
    string,
    {
      body: Blob;
      httpMetadata?: R2HTTPMetadata;
      customMetadata?: Record<string, string>;
    }
  >();

  async put(
    key: string,
    value: Blob | string,
    options: R2PutOptions = {},
  ): Promise<R2Object> {
    const body = typeof value === 'string' ? new Blob([value]) : value;
    this.objects.set(key, {
      body,
      httpMetadata: options.httpMetadata as R2HTTPMetadata | undefined,
      customMetadata: options.customMetadata,
    });
    return { key } as R2Object;
  }

  async head(key: string): Promise<R2Object | null> {
    return this.objects.has(key) ? ({ key } as R2Object) : null;
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    const headers = stored.httpMetadata;
    return {
      key,
      httpEtag: '"mock-etag"',
      customMetadata: stored.customMetadata,
      body: stored.body.stream(),
      writeHttpMetadata(target: Headers) {
        if (headers?.contentType) {
          target.set('content-type', headers.contentType);
        }
      },
    } as R2ObjectBody;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
