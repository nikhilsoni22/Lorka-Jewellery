import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { API_CACHE_TAG } from '@/lib/api';

function isAuthorised(provided: string | null): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the API after admin changes (products, prices, banners, settings…) so the cached
 * pages update straight away instead of after the one-minute cache window.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorised(request.headers.get('x-internal-key'))) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  revalidateTag(API_CACHE_TAG);
  revalidatePath('/', 'layout');
  return NextResponse.json({ success: true, revalidatedAt: new Date().toISOString() });
}
