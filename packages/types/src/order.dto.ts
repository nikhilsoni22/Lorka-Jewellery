import type { z } from 'zod';
import type {
  createOrderSchema,
  updateOrderStatusSchema,
  setBuildEtaSchema,
  refundOrderSchema,
  checkoutDetailsSchema,
  orderQuerySchema,
  trackOrderQuerySchema,
  submitUpiPaymentSchema,
  reviewPaymentSchema,
} from './order.schemas';
import type { OrderStatus, PaymentMethod, PaymentStatus } from './order.enums';

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type SetBuildEtaInput = z.infer<typeof setBuildEtaSchema>;
export type RefundOrderInput = z.infer<typeof refundOrderSchema>;
export type CheckoutDetailsInput = z.infer<typeof checkoutDetailsSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type TrackOrderQuery = z.infer<typeof trackOrderQuerySchema>;
export type SubmitUpiPaymentInput = z.infer<typeof submitUpiPaymentSchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;

export interface OrderItemResponse {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isBuildOrder: boolean;
}

export interface ShippingAddressResponse {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  location?: { lat: number; lng: number } | null;
}

export interface OrderChargeResponse {
  name: string;
  amount: number;
}

export interface OrderStatusEventResponse {
  status: OrderStatus;
  at: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  /** Every status the order has moved through, oldest first — drives the customer tracking timeline. */
  statusHistory: OrderStatusEventResponse[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  /** UPI transaction ID / UTR the customer entered after paying — the admin matches it in the bank. */
  upiReference?: string;
  upiSubmittedAt?: string;
  /** UPI orders only: cancelled automatically if no transaction ID is entered by then. */
  upiPaymentDueAt?: string;
  /** When the admin confirmed a UPI payment reached the account. */
  paymentVerifiedAt?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddressResponse;
  items: OrderItemResponse[];
  subtotal: number;
  /** Coupon applied at checkout, if any; `discount` is taken off the subtotal before charges. */
  couponCode?: string;
  discount: number;
  /** COD orders carry their COD fee as a `charges` line instead (named COD_FEE_LABEL). */
  charges: OrderChargeResponse[];
  /** Taken off for paying up front (online / UPI). */
  prepaidDiscount: number;
  total: number;
  notes?: string;
  giftWrap: boolean;
  giftMessage?: string;
  /** Running total refunded through Razorpay (partial refunds add up). */
  refundedAmount: number;
  refundedAt?: string;
  hasBuildItems: boolean;
  estimatedReadyDate?: string;
  createdAt: string;
  updatedAt: string;
}
