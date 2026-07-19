import type { OrderResponse } from '@lorka/types';

export interface IEmailService {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
  sendOrderConfirmation(to: string, order: OrderResponse): Promise<void>;
  sendEmailVerificationOtp(to: string, otp: string): Promise<void>;
  sendBuildEtaUpdate(to: string, order: OrderResponse): Promise<void>;
  sendAdminOrderNotification(to: string, order: OrderResponse): Promise<void>;
  /** `order.status` is the new status — sent whenever admin changes an order's status. */
  sendOrderStatusUpdate(to: string, order: OrderResponse): Promise<void>;
}
