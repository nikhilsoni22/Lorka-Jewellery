import type { NextRequest } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

// Request headers worth passing on to the API; everything else (host, origin, Vercel's own
// headers…) would only confuse it.
const FORWARDED_HEADERS = ['content-type', 'authorization', 'cookie', 'user-agent', 'accept'];

/**
 * Relays the browser's `/auth/*` calls to the API from the website's own domain. The refresh
 * cookie is then first-party (set on this site, path /api/v1/auth) instead of a third-party
 * cookie on the API's domain — which Safari, Brave, incognito Chrome etc. block, logging the
 * customer out on every page refresh.
 */
async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${API_URL}/auth/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Every relayed request reaches the API from this host's IPs, so pass the visitor's real IP
  // (Vercel overwrites x-forwarded-for, so it can't be spoofed) for the API's per-IP rate limits.
  // The API only trusts it alongside the internal key.
  const internalKey = process.env.INTERNAL_API_KEY;
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (internalKey) {
    headers.set('x-internal-key', internalKey);
    if (clientIp) headers.set('x-client-ip', clientIp);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return Response.json(
      { success: false, message: 'Unable to reach the server. Please try again.' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  for (const cookie of upstream.headers.getSetCookie()) {
    // Drop any Domain= the API adds (COOKIE_DOMAIN) so the cookie always belongs to this site.
    responseHeaders.append('set-cookie', cookie.replace(/;\s*domain=[^;]*/gi, ''));
  }

  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
}

export const dynamic = 'force-dynamic';
export { proxy as GET, proxy as POST };
