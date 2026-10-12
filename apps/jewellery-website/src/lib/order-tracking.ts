import type { OrderResponse } from '@lorka/types';

type Status = OrderResponse['status'];

export type TrackingStepKey = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface TrackingStep {
  key: TrackingStepKey;
  label: string;
  /** When the order reached this step, if known (a step admin skipped over has no time). */
  at?: string;
  done: boolean;
}

export interface TrackingState {
  steps: TrackingStep[];
  /** Index of the furthest step reached. */
  currentIndex: number;
  cancelled: boolean;
  /** Delivered or cancelled — nothing further will change, so live polling can stop. */
  final: boolean;
}

const FLOW: { key: Exclude<TrackingStepKey, 'cancelled'>; label: string }[] = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const flowIndex = (status: Status) => FLOW.findIndex((s) => s.key === status);

/** Latest time the order entered `status` (admin may move an order back and forth). */
function lastTimeOf(order: OrderResponse, status: TrackingStepKey): string | undefined {
  for (let i = order.statusHistory.length - 1; i >= 0; i--) {
    if (order.statusHistory[i]!.status === status) return order.statusHistory[i]!.at;
  }
  return undefined;
}

export function getTrackingState(order: OrderResponse): TrackingState {
  const cancelled = order.status === 'cancelled';

  // For a cancelled order, show how far it got before it was cancelled.
  let reached = flowIndex(order.status);
  if (cancelled) {
    reached = 0;
    for (const event of order.statusHistory) {
      if (event.status !== 'cancelled') reached = Math.max(reached, flowIndex(event.status));
    }
  }

  const flow = cancelled ? FLOW.slice(0, reached + 1) : FLOW;
  const steps: TrackingStep[] = flow.map((s, i) => ({
    key: s.key,
    label: s.label,
    at: i <= reached ? lastTimeOf(order, s.key) : undefined,
    done: i <= reached,
  }));
  if (cancelled) {
    steps.push({ key: 'cancelled', label: 'Cancelled', at: lastTimeOf(order, 'cancelled'), done: true });
  }

  return {
    steps,
    currentIndex: cancelled ? steps.length - 1 : reached,
    cancelled,
    final: cancelled || order.status === 'delivered',
  };
}

export const STATUS_COPY: Record<Status, { title: string; message: string; update: string }> = {
  pending: {
    title: 'Order placed',
    message: 'We have received your order and will confirm it shortly.',
    update: 'Your order has been placed successfully.',
  },
  confirmed: {
    title: 'Order confirmed',
    message: 'Our artisans are carefully preparing and packing your jewellery.',
    update: 'Your order has been confirmed and is being prepared.',
  },
  shipped: {
    title: 'On the way',
    message: 'Your order has been shipped and will reach you soon.',
    update: 'Your order has been shipped and is on its way to you.',
  },
  delivered: {
    title: 'Delivered',
    message: 'Your jewellery has been delivered. We hope you love it!',
    update: 'Your order has been delivered.',
  },
  cancelled: {
    title: 'Order cancelled',
    message: 'This order has been cancelled. Reach out to us if you have any questions.',
    update: 'Your order has been cancelled.',
  },
};

export function trackOrderHref(order: Pick<OrderResponse, 'orderNumber' | 'customerPhone'>) {
  return `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone)}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
