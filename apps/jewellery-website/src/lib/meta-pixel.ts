// Public identifier (it's visible in every page's source), so a production default is safe.
// Dev/preview builds send nothing unless NEXT_PUBLIC_META_PIXEL_ID is set, so test traffic
// doesn't pollute the real ad data.
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? (process.env.NODE_ENV === 'production' ? '1667903488060621' : '');

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type PixelEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';

interface PixelItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/** Fires a Meta Pixel event. A no-op when the pixel is off or blocked (ad-blockers, Do Not Track). */
export function trackPixel(event: PixelEvent, params?: Record<string, unknown>, eventId?: string): void {
  if (!META_PIXEL_ID || typeof window === 'undefined') return;
  try {
    window.fbq?.('track', event, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // Tracking must never break the storefront.
  }
}

/** Shared by every product-level event so Meta can match them to the catalogue. */
export function pixelContents(items: PixelItem[]) {
  return {
    content_type: 'product',
    content_ids: items.map((i) => i.productId),
    contents: items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.unitPrice })),
    value: Math.round(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100,
    currency: 'INR',
  };
}
