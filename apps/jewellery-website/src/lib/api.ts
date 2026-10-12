import type { ApiResponse } from '@lorka/types';

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

/** Every server-side API response is tagged with this, so one call can refresh them all. */
export const API_CACHE_TAG = 'api';

/**
 * Server-only fetch helper for React Server Components, instead of a client
 * data-fetching library — this is public, SEO-sensitive catalog content with no
 * auth/mutations, so there is no reason to ship a client bundle for it.
 *
 * Responses are cached for `revalidateSeconds` (default a minute) so pages load fast and the API
 * isn't hit on every page view. Admin changes still show immediately: the API calls
 * /api/revalidate after every catalog write, which drops this cache. Pass 0 for data that must
 * always be fresh.
 */
export async function apiGet<T>(path: string, revalidateSeconds = 60): Promise<T> {
  // Identifies this server to the API so its per-IP rate limit (meant for individual visitors)
  // doesn't throttle every visitor at once — all SSR fetches share the host's IPs.
  const internalKey = process.env.INTERNAL_API_KEY;
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: revalidateSeconds, tags: [API_CACHE_TAG] },
    headers: internalKey ? { 'x-internal-key': internalKey } : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.message);
  return json.data;
}
