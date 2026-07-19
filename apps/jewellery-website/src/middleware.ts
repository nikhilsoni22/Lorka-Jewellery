import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse, SettingsResponse } from '@lorka/types';

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

/**
 * Fail-open by design: if the API is unreachable, the storefront stays up rather
 * than appearing broken to every visitor.
 */
export async function middleware(request: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/settings`, { cache: 'no-store' });
    const json = (await res.json()) as ApiResponse<SettingsResponse>;

    if (json.success) {
      const { maintenance } = json.data;
      const now = Date.now();
      const startOk = !maintenance.startAt || new Date(maintenance.startAt).getTime() <= now;
      const endOk = !maintenance.endAt || new Date(maintenance.endAt).getTime() >= now;

      if (maintenance.enabled && startOk && endOk) {
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.rewrite(url);
      }
    }
  } catch {
    // API unreachable — let the request through.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|maintenance).*)'],
};
