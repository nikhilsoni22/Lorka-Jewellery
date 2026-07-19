import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiResponse, LoginResult } from '@lorka/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

/**
 * The access token lives only in memory (never localStorage) to reduce XSS blast
 * radius. Session continuity across reloads comes from the httpOnly refresh cookie.
 */
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
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

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
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
