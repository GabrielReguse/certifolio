import type { ApiErrorBody } from '../types';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  timeoutMs?: number;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body: BodyInit | undefined;

  if (options.body instanceof FormData || options.body instanceof Blob || typeof options.body === 'string') {
    body = options.body as BodyInit;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const response = await fetch(path, {
      ...options,
      headers,
      body,
      credentials: 'include',
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ApiErrorBody;
      throw new ApiError(error.message || 'Não foi possível concluir a solicitação.', response.status, error.error, error.issues);
    }

    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError('A solicitação demorou demais ou foi cancelada.', 0, 'REQUEST_ABORTED');
    throw new ApiError('Não foi possível conectar ao servidor.', 0, 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function uploadFile<T>(path: string, file: File, field = 'file'): Promise<T> {
  const form = new FormData();
  form.set(field, file);
  return api<T>(path, { method: 'POST', body: form, timeoutMs: 120_000 });
}
