interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const { body, headers, ...requestInit } = init;
  const hasJsonBody = body !== undefined && !(body instanceof FormData);
  const response = await fetch(path, {
    ...requestInit,
    credentials: 'same-origin',
    headers: {
      ...(hasJsonBody ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: hasJsonBody ? JSON.stringify(body) : body,
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiErrorPayload
    | T
    | null;

  if (!response.ok) {
    const error = (payload as ApiErrorPayload | null)?.error;
    throw new ApiError(
      error?.message ?? `请求失败 (${response.status})`,
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.details,
    );
  }

  if (payload === null && response.status !== 204) {
    throw new ApiError(
      '服务返回了无效响应',
      response.status,
      'INVALID_RESPONSE',
    );
  }

  return payload as T;
}
