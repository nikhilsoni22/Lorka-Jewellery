import type { z } from 'zod';
import type {
  createOrderSchema,
  updateOrderStatusSchema,
  setBuildEtaSchema,
  orderQuerySchema,
  trackOrderQuerySchema,
} from './order.schemas';
import type { OrderStatus, PaymentMethod, PaymentStatus } from './order.enums';

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type SetBuildEtaInput = z.infer<typeof setBuildEtaSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type TrackOrderQuery = z.infer<typeof trackOrderQuerySchema>;

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
}

export interface OrderChargeResponse {
  name: string;
  amount: number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddressResponse;
  items: OrderItemResponse[];
  subtotal: number;
  charges: OrderChargeResponse[];
  total: number;
  notes?: string;
  hasBuildItems: boolean;
  estimatedReadyDate?: string;
  createdAt: string;
  updatedAt: string;
}
