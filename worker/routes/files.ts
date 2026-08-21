import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import { requireAuth } from '../auth/permissions';
import type { AuthVariables } from '../auth/types';
import type { WorkerBindings } from '../db/types';
import { errorResponse } from '../http/errors';

type FilesEnv = {
  Bindings: WorkerBindings;
  Variables: AuthVariables;
};

export type FilePurpose = 'image' | 'rule' | 'attachment';

type FileMetadata = {
  contentType: string;
  ownerId: string;
  purpose: FilePurpose;
  originalName: string;
};

const KV_BUCKET_ID = 'kv';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const OBJECT_KEY_PATTERN =
  /^users\/[A-Za-z0-9_-]{1,128}\/(images|rules|attachments)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,160}$/;

const IMAGE_TYPES = new Map([
  ['image/jpeg', ['jpg', 'jpeg']],
  ['image/png', ['png']],
  ['image/gif', ['gif']],
  ['image/webp', ['webp']],
]);

const DOCUMENT_TYPES = new Map([
  ['application/pdf', ['pdf']],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ['docx'],
  ],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ['xlsx'],
  ],
  [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ['pptx'],
  ],
  ['text/csv', ['csv']],
  ['text/plain', ['txt', 'md', 'csv']],
]);

const ensureFileAuth: MiddlewareHandler<FilesEnv> = async (context, next) => {
  if (context.get('user')) {
    await next();
    return;
  }
  return requireAuth(context, next);
};

export function createFilesRouter(
  authMiddleware: MiddlewareHandler<FilesEnv> = ensureFileAuth,
): Hono<FilesEnv> {
  const router = new Hono<FilesEnv>();

  router.use('/files', authMiddleware);
  router.use('/files/*', authMiddleware);

  router.post('/files', async (context) => {
    const form = await context.req.formData().catch(() => null);
    const file = form?.get('file');
    const purpose = form?.get('purpose');

    if (!(file instanceof File) || !isFilePurpose(purpose)) {
      return errorResponse(
        context,
        400,
        'INVALID_FILE_UPLOAD',
        'file and a valid purpose are required.',
      );
    }

    const validationError = validateUpload(file, purpose);
    if (validationError) {
      return errorResponse(
        context,
        validationError.status,
        validationError.code,
        validationError.message,
      );
    }

    const user = context.get('user');
    const key = createObjectKey(user.id, purpose, file.name);
    await context.env.FILES.put(key, await file.arrayBuffer(), {
      metadata: {
        contentType: file.type,
        ownerId: user.id,
        purpose,
        originalName: safeMetadataValue(file.name),
      },
    });

    return context.json(
      {
        id: key,
        bucketId: KV_BUCKET_ID,
        filePath: key,
        url: fileUrl(key, false),
        downloadUrl: fileUrl(key, true),
      },
      201,
    );
  });

  router.get('/files/content', (context) => serveFile(context, false));
  router.get('/files/download', (context) => serveFile(context, true));

  router.delete('/files', async (context) => {
    const key = context.req.query('key') ?? '';
    const user = context.get('user');
    if (!isValidObjectKey(key) || !isOwnedObjectKey(key, user.id)) {
      return errorResponse(
        context,
        403,
        'FILE_DELETE_FORBIDDEN',
        'Only unreferenced files uploaded by the current user can be deleted.',
      );
    }
    if (await isReferencedObject(context.env.DB, key)) {
      return errorResponse(
        context,
        409,
        'FILE_IN_USE',
        'The file is referenced by a business record and cannot be deleted.',
      );
    }
    if (!(await context.env.FILES.get(key, 'stream'))) {
      return errorResponse(
        context,
        404,
        'FILE_NOT_FOUND',
        'The requested file does not exist.',
      );
    }

    await context.env.FILES.delete(key);
    return context.body(null, 204);
  });

  return router;
}

async function serveFile(
  context: Context<FilesEnv>,
  download: boolean,
): Promise<Response> {
  const key = context.req.query('key') ?? '';
  if (!isValidObjectKey(key)) {
    return errorResponse(
      context,
      400,
      'INVALID_FILE_KEY',
      'The requested file key is invalid.',
    );
  }

  const user = context.get('user');
  const allowed =
    isOwnedObjectKey(key, user.id) ||
    (await isReferencedObject(context.env.DB, key));
  if (!allowed) {
    return errorResponse(
      context,
      403,
      'FILE_READ_FORBIDDEN',
      'The requested file is not accessible.',
    );
  }

  const result = await context.env.FILES.getWithMetadata(
    key,
    'arrayBuffer',
  );
  if (!result.value) {
    return errorResponse(
      context,
      404,
      'FILE_NOT_FOUND',
      'The requested file does not exist.',
    );
  }

  const metadata = result.metadata as FileMetadata | null;
  const headers = new Headers();
  headers.set('content-type', metadata?.contentType ?? 'application/octet-stream');
  headers.set('cache-control', 'private, no-store');
  headers.set('x-content-type-options', 'nosniff');
  const originalName =
    metadata?.originalName ?? fileNameFromKey(key);
  headers.set(
    'content-disposition',
    contentDisposition(originalName, download),
  );

  return new Response(result.value, { headers });
}

export function validateUpload(
  file: Pick<File, 'name' | 'size' | 'type'>,
  purpose: FilePurpose,
): { status: 400 | 413 | 415; code: string; message: string } | null {
  if (file.size <= 0) {
    return {
      status: 400,
      code: 'EMPTY_FILE',
      message: 'Empty files cannot be uploaded.',
    };
  }

  const maxBytes = purpose === 'image' ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > maxBytes) {
    return {
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: `The file exceeds the ${maxBytes / 1024 / 1024} MB limit.`,
    };
  }

  const extension = extensionFromName(file.name);
  const allowedTypes = purpose === 'image' ? IMAGE_TYPES : DOCUMENT_TYPES;
  const allowedExtensions = allowedTypes.get(file.type.toLowerCase());
  if (!extension || !allowedExtensions?.includes(extension)) {
    return {
      status: 415,
      code: 'UNSUPPORTED_FILE_TYPE',
      message:
        purpose === 'image'
          ? 'Only JPEG, PNG, GIF and WebP images are supported.'
          : 'Only PDF, DOCX, XLSX, PPTX, CSV, TXT and Markdown files are supported.',
    };
  }

  return null;
}

export function isValidObjectKey(key: string): boolean {
  return OBJECT_KEY_PATTERN.test(key) && !key.includes('..');
}

export async function isReferencedObject(
  db: D1Database,
  key: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS found
       WHERE EXISTS (
         SELECT 1 FROM demand
         WHERE json_extract(image, '$.fileKey') = ?
            OR json_extract(image, '$.r2Key') = ?
            OR json_extract(image, '$.filePath') = ?
            OR instr(background, ?) > 0
            OR EXISTS (
              SELECT 1 FROM json_tree(demand.custom_fields)
              WHERE json_tree.key IN ('fileKey', 'r2Key', 'filePath')
                AND json_tree.value = ?
            )
       )
       OR EXISTS (
         SELECT 1 FROM rule
         WHERE json_extract(file, '$.fileKey') = ?
            OR json_extract(file, '$.r2Key') = ?
            OR json_extract(file, '$.filePath') = ?
       )
       LIMIT 1`,
    )
    .bind(key, key, key, encodeURIComponent(key), key, key, key, key)
    .first<{ found: number }>();

  return row?.found === 1;
}

function isFilePurpose(value: unknown): value is FilePurpose {
  return value === 'image' || value === 'rule' || value === 'attachment';
}

function createObjectKey(
  userId: string,
  purpose: FilePurpose,
  originalName: string,
): string {
  const directory =
    purpose === 'image'
      ? 'images'
      : purpose === 'rule'
        ? 'rules'
        : 'attachments';
  const safeUserId = userId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128);
  const safeName = sanitizeFileName(originalName);
  return `users/${safeUserId}/${directory}/${crypto.randomUUID()}/${safeName}`;
}

function isOwnedObjectKey(key: string, userId: string): boolean {
  const safeUserId = userId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128);
  return key.startsWith(`users/${safeUserId}/`);
}

function sanitizeFileName(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .slice(-160);
  return normalized || 'file';
}

function safeMetadataValue(value: string): string {
  return value.replace(/[\r\n]/g, ' ').slice(0, 512);
}

function extensionFromName(name: string): string | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(name);
  return match?.[1].toLowerCase() ?? null;
}

function fileNameFromKey(key: string): string {
  return key.slice(key.lastIndexOf('/') + 1) || 'download';
}

function contentDisposition(fileName: string, download: boolean): string {
  const fallback =
    sanitizeFileName(fileName).replace(/["\\]/g, '_') || 'download';
  const normalized = fileName.replace(/[\r\n]/g, '');
  let encoded: string;
  try {
    encoded = encodeURIComponent(normalized);
  } catch {
    encoded = encodeURIComponent(fallback);
  }
  return `${download ? 'attachment' : 'inline'}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function fileUrl(key: string, download: boolean): string {
  return `/api/files/${download ? 'download' : 'content'}?key=${encodeURIComponent(key)}`;
}

const filesRoutes = createFilesRouter();

export default filesRoutes;
