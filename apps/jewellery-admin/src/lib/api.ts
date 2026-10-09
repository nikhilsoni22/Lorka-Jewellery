import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiResponse, LoginResult } from '@lorka/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

/**
 * The access token lives only in memory (never localStorage) to reduce XSS blast
 * radius. Session continuity across reloads comes from the httpOnly refresh cookie.
 */
let accessToken: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

/** Reads the `exp` claim (ms epoch) from a JWT without verifying it. */
function tokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window === 'undefined') return;
  clearTimeout(refreshTimer);
  const exp = token ? tokenExpiryMs(token) : null;
  if (exp) {
    // Renew a minute before expiry so an open admin page never hits an expired token.
    const delay = Math.max(exp - Date.now() - 60_000, 5_000);
    refreshTimer = setTimeout(() => void sharedRefresh(), Math.min(delay, 2_147_000_000));
  }
};
export const getAccessToken = () => accessToken;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh request.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<ApiResponse<LoginResult>>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    if (data.success) {
      setAccessToken(data.data.accessToken);
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

function sharedRefresh(): Promise<string | null> {
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      const token = await sharedRefresh();
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Attempts to restore a session from the refresh cookie on app load. */
export async function bootstrapSession(): Promise<LoginResult | null> {
  const { data } = await axios
    .post<ApiResponse<LoginResult>>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
    .catch(() => ({ data: { success: false } as ApiResponse<LoginResult> }));
  if (data.success) {
    setAccessToken(data.data.accessToken);
    return data.data;
  }
  return null;
}
