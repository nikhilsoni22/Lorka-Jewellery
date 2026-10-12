'use client';

import { useCallback, useRef } from 'react';
import type { OrderResponse } from '@lorka/types';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

export type OrderLookupSource = 'mine' | 'track';

/**
 * Fetches an order from the browser, never from the Next server: the API rate-limits the
 * orderNumber+phone lookup per IP, and server-side fetches would make every customer share the
 * hosting provider's IP (and its 20-per-15-min budget).
 *
 * Signed-in owners use their account endpoint (no strict limiter); anyone else — or an order
 * placed as a guest — falls back to the orderNumber + phone lookup. `ready` is false until the
 * session check finishes, so the first fetch knows which endpoint to try.
 */
export function useOrderLookup(orderNumber: string, phone: string) {
  const { status: authStatus } = useAuth();
  const sourceRef = useRef<OrderLookupSource | null>(null);

  const fetchOrder = useCallback(async () => {
    const minePath = `/orders/mine/${encodeURIComponent(orderNumber)}`;
    const trackPath = `/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`;
    if (sourceRef.current) {
      return apiClient.get<OrderResponse>(sourceRef.current === 'mine' ? minePath : trackPath);
    }
    if (authStatus === 'authenticated') {
      try {
        const mine = await apiClient.get<OrderResponse>(minePath);
        sourceRef.current = 'mine';
        return mine;
      } catch {
        // Not this account's order.
      }
    }
    const tracked = await apiClient.get<OrderResponse>(trackPath);
    sourceRef.current = 'track';
    return tracked;
  }, [authStatus, orderNumber, phone]);

  return { fetchOrder, sourceRef, authStatus, ready: authStatus !== 'loading' };
}
