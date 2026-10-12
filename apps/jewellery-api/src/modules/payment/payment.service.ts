import type { CreateRazorpayOrderInput, RazorpayOrderResponse } from '@lorka/types';
import type { IPendingCheckoutRepository, ISettingsRepository } from '../../common/interfaces/repositories';
import type { IEmailService } from '../../common/interfaces/services';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../common/logger/logger';
import type { CheckoutPricer } from '../order/checkout-pricer';
import type { OrderService } from '../order/order.service';
import { createRazorpayOrder, verifyRazorpayWebhookSignature } from './razorpay.client';

function generateReceipt(): string {
  return `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** The parts of a Razorpay webhook body this service reads. */
interface RazorpayWebhookEvent {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } };
  };
}

export class PaymentService {
  constructor(
    private readonly settingsRepo: ISettingsRepository,
    private readonly pricer: CheckoutPricer,
    private readonly pending: IPendingCheckoutRepository,
    private readonly orders: OrderService,
    private readonly email: IEmailService,
  ) {}

  async createRazorpayOrder(input: CreateRazorpayOrderInput, userId?: string): Promise<RazorpayOrderResponse> {
    const settings = await this.settingsRepo.get();
    if (!settings.paymentMethods.onlineEnabled) {
      throw AppError.badRequest('Online payment is currently unavailable.');
    }
    if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
      throw AppError.badRequest('Online payment is not configured yet. Add your Razorpay keys in Settings.');
    }

    const { total } = await this.pricer.price(input);
    if (total <= 0) throw AppError.badRequest('Order total must be greater than zero');

    const amountPaise = Math.round(total * 100);
    const razorpayOrder = await createRazorpayOrder(
      amountPaise,
      generateReceipt(),
      settings.razorpayKeyId,
      settings.razorpayKeySecret,
    );

    // Saved so the webhook can create the order if the customer never makes it back from payment.
    await this.pending.create({
      razorpayOrderId: razorpayOrder.id,
      userId: userId ?? null,
      input,
      amountPaise,
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: settings.razorpayKeyId,
    };
  }

  /**
   * Razorpay → us, when a payment is captured. Makes sure an order exists for every captured
   * payment, even if the customer closed the tab or lost connection right after paying.
   * Returns normally for anything we can't or needn't act on, so Razorpay stops retrying;
   * throws only for a bad signature.
   */
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
    const settings = await this.settingsRepo.get();
    if (!settings.razorpayWebhookSecret) {
      logger.warn('[payment] Razorpay webhook received but no webhook secret is set in Settings');
      throw AppError.badRequest('Webhook secret not configured');
    }
    if (!rawBody || !signature || !verifyRazorpayWebhookSignature(rawBody, signature, settings.razorpayWebhookSecret)) {
      throw AppError.badRequest('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookEvent;
    if (event.event !== 'payment.captured') return;

    const payment = event.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id) return;

    const pending = await this.pending.findByRazorpayOrderId(payment.order_id);
    if (!pending) {
      // Not created through our checkout (e.g. a payment link) — nothing to build an order from.
      logger.warn({ razorpayOrderId: payment.order_id }, '[payment] Captured payment has no saved checkout');
      return;
    }

    try {
      const order = await this.orders.createFromPaidCheckout(pending.input, pending.userId, {
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
      });
      logger.info({ orderNumber: order.orderNumber, paymentId: payment.id }, '[payment] Webhook confirmed order');
    } catch (err) {
      // The customer has been charged but no order could be created — a human must step in.
      logger.error({ err, paymentId: payment.id }, '[payment] Paid order could not be created from webhook');
      if (settings.notificationEmail) {
        void this.email
          .sendAdminPaymentAlert(settings.notificationEmail, {
            razorpayPaymentId: payment.id,
            razorpayOrderId: payment.order_id,
            amount: (payment.amount ?? pending.amountPaise) / 100,
            customerName: pending.input.customerName,
            customerPhone: pending.input.customerPhone,
            reason: err instanceof Error ? err.message : 'Unknown error',
          })
          .catch((mailErr) => logger.error({ err: mailErr }, '[payment] Failed to send payment alert email'));
      }
    }
  }
}
