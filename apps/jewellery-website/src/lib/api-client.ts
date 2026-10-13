import type { ApiResponse, LoginResult } from '@lorka/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
/**
 * `/auth/*` goes through this site's own relay (app/api/v1/auth) so the refresh cookie is a
 * first-party cookie — browsers increasingly block the API domain's cookie as third-party.
 */
const AUTH_BASE = '/api/v1';

/**
 * In-memory access token (never localStorage, to reduce XSS blast radius). Session
 * continuity across reloads comes from the httpOnly refresh cookie via `bootstrapSession`.
 */
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

async function rawRequest<T>(path: string, init?: RequestInit): Promise<{ status: number; json: ApiResponse<T> }> {
  const headers: Record<string, string> = {
    // FormData sets its own multipart Content-Type (with the boundary) — don't override it.
    ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const base = path.startsWith('/auth/') ? AUTH_BASE : API_URL;
  const res = await fetch(`${base}${path}`, { ...init, headers, credentials: 'include' });
  const json = (await res.json()) as ApiResponse<T>;
  return { status: res.status, json };
}

/** Client-side counterpart to `lib/api.ts` (which is server-only/ISR-cached). */
async function request<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
  const { status, json } = await rawRequest<T>(path, init);
  if (!json.success) {
    if (status === 401 && allowRetry) {
      const refreshed = await bootstrapSession();
      if (refreshed) return request<T>(path, init, false);
    }
    throw new Error(json.message);
  }
  return json.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};

/**
 * Attempts to restore a session from the refresh cookie (on app load, or after a 401). Concurrent
 * callers share one request — the API rotates the refresh token on every use, so parallel
 * refreshes would otherwise race each other for the cookie.
 */
let refreshInFlight: Promise<LoginResult | null> | null = null;
export function bootstrapSession(): Promise<LoginResult | null> {
  refreshInFlight ??= refreshSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function refreshSession(): Promise<LoginResult | null> {
  try {
    const { json } = await rawRequest<LoginResult>('/auth/refresh', { method: 'POST' });
    if (json.success) {
      setAccessToken(json.data.accessToken);
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}
