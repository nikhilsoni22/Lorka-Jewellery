import type { OrderResponse, ShippingAddressResponse, TicketResponse } from '@lorka/types';

/** A new support ticket plus whatever contact details we have on file for the customer. */
export interface AdminTicketNotification {
  ticket: TicketResponse;
  /** Phone and address come from the customer's most recent order — user accounts don't store them. */
  customerPhone?: string;
  shippingAddress?: ShippingAddressResponse;
  latestOrderNumber?: string;
}

/** A customer was charged online but no order could be created — the admin must follow up. */
export interface AdminPaymentAlert {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  reason: string;
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
  sendAdminPaymentAlert(to: string, data: AdminPaymentAlert): Promise<void>;
  /** The customer entered a UTR for a UPI order — the admin should check the bank and verify it. */
  sendAdminUpiPaymentSubmitted(to: string, order: OrderResponse): Promise<void>;
  /** Admin confirmed the customer's UPI payment reached the account. */
  sendPaymentVerified(to: string, order: OrderResponse): Promise<void>;
  /** Admin couldn't find the customer's UPI payment; `reason` is optional free text from the admin. */
  sendPaymentRejected(to: string, order: OrderResponse, reason: string): Promise<void>;
  /** A UPI order was cancelled automatically because it wasn't paid in time. */
  sendUnpaidOrderCancelled(to: string, order: OrderResponse): Promise<void>;
}

/** A Google account proven by a verified Firebase ID token. */
export interface VerifiedGoogleIdentity {
  uid: string;
  email: string;
  name?: string;
}

export interface IGoogleTokenVerifier {
  /** Throws an `AppError` (401) if the token is invalid, expired, or not a verified Google sign-in. */
  verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}
