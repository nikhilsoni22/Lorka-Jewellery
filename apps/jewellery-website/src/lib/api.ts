import type { ApiResponse } from '@lorka/types';

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

/**
 * Server-only fetch helper for React Server Components, instead of a client
 * data-fetching library — this is public, SEO-sensitive catalog content with no
 * auth/mutations, so there is no reason to ship a client bundle for it.
 *
 * Always fetches fresh from the API (no local/ISR caching): catalog content is
 * admin-managed and expected to reflect the current database immediately, not
 * up to `revalidateSeconds` stale.
 */
export async function apiGet<T>(path: string, revalidateSeconds = 0): Promise<T> {
  // Identifies this server to the API so its per-IP rate limit (meant for individual visitors)
  // doesn't throttle every visitor at once — all SSR fetches share the host's IPs.
  const internalKey = process.env.INTERNAL_API_KEY;
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
    headers: internalKey ? { 'x-internal-key': internalKey } : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.message);
  return json.data;
}
