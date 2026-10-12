import type { OrderResponse, ShippingAddressResponse, TicketResponse } from '@lorka/types';

/** A new support ticket plus whatever contact details we have on file for the customer. */
export interface AdminTicketNotification {
  ticket: TicketResponse;
  /** Phone and address come from the customer's most recent order — user accounts don't store them. */
  customerPhone?: string;
  shippingAddress?: ShippingAddressResponse;
  latestOrderNumber?: string;
}

export interface IEmailService {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
  sendOrderConfirmation(to: string, order: OrderResponse): Promise<void>;
  sendEmailVerificationOtp(to: string, otp: string): Promise<void>;
  sendBuildEtaUpdate(to: string, order: OrderResponse): Promise<void>;
  sendAdminOrderNotification(to: string, order: OrderResponse): Promise<void>;
  /** `order.status` is the new status — sent whenever admin changes an order's status. */
  sendOrderStatusUpdate(to: string, order: OrderResponse): Promise<void>;
  sendAdminTicketNotification(to: string, data: AdminTicketNotification): Promise<void>;
}
