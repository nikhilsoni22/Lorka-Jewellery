import type { ApiResponse } from '@lorka/types';

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

/**
 * Server-only fetch helper for React Server Components. Uses Next's fetch cache
 * (ISR) instead of a client data-fetching library — this is public, SEO-sensitive
 * catalog content with no auth/mutations, so there is no reason to ship a client
 * bundle for it.
 */
export async function apiGet<T>(path: string, revalidateSeconds = 60): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: revalidateSeconds } });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.message);
  return json.data;
}
