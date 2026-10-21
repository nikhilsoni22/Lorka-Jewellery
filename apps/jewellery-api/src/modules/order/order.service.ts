import { OrderStatus, PaymentMethod, PaymentStatus } from '@lorka/types';
import type {
  CheckoutDetailsInput,
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderQuery,
  OrderResponse,
  RefundOrderInput,
  ReviewPaymentInput,
  SubmitUpiPaymentInput,
} from '@lorka/types';
import type { OrderEntity } from '../../common/interfaces/entities';
import {
  DuplicateRazorpayOrderError,
  DuplicateUpiReferenceError,
  type IOrderRepository,
  type IProductRepository,
  type IUserRepository,
  type ISettingsRepository,
  type Pagination,
} from '../../common/interfaces/repositories';
import type { IEmailService } from '../../common/interfaces/services';
import { AppError } from '../../common/errors/app-error';
import { generateUniqueOrderNumber } from '../../common/utils/order-number';
import { refundRazorpayPayment, verifyRazorpaySignature } from '../payment/razorpay.client';
import { logger } from '../../common/logger/logger';
import type { CouponService } from '../coupon/coupon.service';
import type { CheckoutPricer } from './checkout-pricer';
import { assertNotBlocked } from '../users/user.service';

/**
 * Orders placed before status history was recorded have an empty (or partial) history, so
 * backfill the "placed" event from `createdAt` and the current status from `updatedAt`.
 */
function buildStatusHistory(order: OrderEntity): OrderResponse['statusHistory'] {
  const history = order.statusHistory.map((e) => ({ status: e.status, at: e.at.toISOString() }));
  if (history[0]?.status !== OrderStatus.Pending) {
    history.unshift({ status: OrderStatus.Pending, at: order.createdAt.toISOString() });
  }
  if (history[history.length - 1]!.status !== order.status) {
    history.push({ status: order.status, at: order.updatedAt.toISOString() });
  }
  return history;
}

export function toOrderResponse(order: OrderEntity): OrderResponse {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusHistory: buildStatusHistory(order),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    upiReference: order.upiReference,
    upiSubmittedAt: order.upiSubmittedAt ? order.upiSubmittedAt.toISOString() : undefined,
    upiPaymentDueAt: order.upiPaymentDueAt ? order.upiPaymentDueAt.toISOString() : undefined,
    paymentVerifiedAt: order.paymentVerifiedAt ? order.paymentVerifiedAt.toISOString() : undefined,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    shippingAddress: order.shippingAddress,
    items: order.items,
    subtotal: order.subtotal,
    couponCode: order.couponCode,
    discount: order.discount,
    charges: order.charges,
    prepaidDiscount: order.prepaidDiscount ?? 0,
    total: order.total,
    notes: order.notes,
    giftWrap: order.giftWrap,
    giftMessage: order.giftMessage,
    refundedAmount: order.refundedAmount ?? 0,
    refundedAt: order.refundedAt ? order.refundedAt.toISOString() : undefined,
    hasBuildItems: order.items.some((item) => item.isBuildOrder),
    estimatedReadyDate: order.estimatedReadyDate ? order.estimatedReadyDate.toISOString() : undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export class OrderService {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly products: IProductRepository,
    private readonly users: IUserRepository,
    private readonly email: IEmailService,
    private readonly settingsRepo: ISettingsRepository,
    private readonly pricer: CheckoutPricer,
    private readonly coupons: CouponService,
  ) {}

  /** Order placed from the checkout page — COD, or online after Razorpay's checkout succeeded. */
  async create(input: CreateOrderInput, userId?: string): Promise<OrderResponse> {
    await this.assertCanOrder(userId);
    const settings = await this.settingsRepo.get();
    const method = input.paymentMethod ?? PaymentMethod.Cod;

    if (method === PaymentMethod.Cod && !settings.paymentMethods.codEnabled) {
      throw AppError.badRequest('Cash on delivery is currently unavailable. Please choose another payment method.');
    }
    if (method === PaymentMethod.Upi) {
      if (!settings.paymentMethods.upiEnabled || !settings.paymentMethods.upiId) {
        throw AppError.badRequest('UPI payment is currently unavailable. Please choose another payment method.');
      }
      // Placed unpaid; the customer pays the exact order total next and submits the UTR.
      return this.place(input, userId, PaymentMethod.Upi);
    }
    if (method === PaymentMethod.Razorpay) {
      const valid =
        input.razorpayOrderId &&
        input.razorpayPaymentId &&
        input.razorpaySignature &&
        settings.razorpayKeySecret &&
        verifyRazorpaySignature(
          input.razorpayOrderId,
          input.razorpayPaymentId,
          input.razorpaySignature,
          settings.razorpayKeySecret,
        );
      if (!valid) throw AppError.badRequest('Payment verification failed');
      return this.place(input, userId, PaymentMethod.Razorpay, {
        razorpayOrderId: input.razorpayOrderId!,
        razorpayPaymentId: input.razorpayPaymentId!,
      });
    }
    return this.place(input, userId, PaymentMethod.Cod);
  }

  /** Blocked customers can't order — checked before taking any money, too (PaymentService). */
  async assertCanOrder(userId: string | undefined): Promise<void> {
    await assertNotBlocked(this.users, userId);
  }

  /**
   * Order created by the Razorpay webhook for a captured payment. The webhook signature has
   * already been verified; if the checkout page created the order first, that order is returned.
   */
  async createFromPaidCheckout(
    input: CheckoutDetailsInput,
    userId: string | null,
    payment: { razorpayOrderId: string; razorpayPaymentId: string },
  ): Promise<OrderResponse> {
    return this.place(input, userId ?? undefined, PaymentMethod.Razorpay, payment);
  }

  /** `payment` is only passed for an order already paid through Razorpay. */
  private async place(
    input: CheckoutDetailsInput,
    userId: string | undefined,
    method: PaymentMethod,
    payment?: { razorpayOrderId: string; razorpayPaymentId: string },
  ): Promise<OrderResponse> {
    const paid = Boolean(payment);
    if (payment) {
      const existing = await this.orders.findByRazorpayOrderId(payment.razorpayOrderId);
      if (existing) return toOrderResponse(existing);
    }

    const priced = await this.pricer.price(input, method, paid);
    const warnings = [...priced.warnings];

    // Reserve stock. A paid order goes through even if stock ran out — the admin is warned instead.
    const decremented: { productId: string; quantity: number }[] = [];
    const releaseStock = () =>
      Promise.all(decremented.map((d) => this.products.incrementStock(d.productId, d.quantity)));
    for (const item of priced.items) {
      if (item.isBuildOrder) continue;
      const ok = await this.products.decrementStock(item.productId, item.quantity);
      if (ok) {
        decremented.push({ productId: item.productId, quantity: item.quantity });
      } else if (!paid) {
        await releaseStock();
        throw AppError.conflict(`${item.name} is no longer available in the requested quantity`);
      }
    }

    if (priced.couponCode && !(await this.coupons.redeem(priced.couponCode, paid))) {
      await releaseStock();
      throw AppError.badRequest('This coupon has just been fully redeemed. Please remove it and try again.');
    }
    const releaseCoupon = () => (priced.couponCode ? this.coupons.release(priced.couponCode) : Promise.resolve());

    const notes = [input.notes, ...warnings.map((w) => `[Needs attention] ${w}`)].filter(Boolean).join('\n');
    let order: OrderEntity;
    try {
      const orderNumber = await generateUniqueOrderNumber((candidate) => this.orders.existsByOrderNumber(candidate));
      order = await this.orders.create({
        orderNumber,
        userId: userId ?? null,
        status: OrderStatus.Pending,
        statusHistory: [{ status: OrderStatus.Pending, at: new Date() }],
        paymentMethod: method,
        paymentStatus: paid ? PaymentStatus.Paid : PaymentStatus.Pending,
        razorpayOrderId: payment?.razorpayOrderId,
        razorpayPaymentId: payment?.razorpayPaymentId,
        upiPaymentDueAt:
          method === PaymentMethod.Upi
            ? new Date(Date.now() + priced.settings.paymentMethods.upiPaymentWindowHours * 3_600_000)
            : null,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        shippingAddress: input.shippingAddress,
        items: priced.items,
        subtotal: priced.subtotal,
        couponCode: priced.couponCode,
        discount: priced.discount,
        charges: priced.charges,
        prepaidDiscount: priced.prepaidDiscount,
        total: priced.total,
        notes,
        giftWrap: input.giftWrap,
        giftMessage: input.giftWrap ? input.giftMessage : '',
      });
    } catch (err) {
      await Promise.all([releaseStock(), releaseCoupon()]);
      // The checkout page and the webhook raced, and the other one won — return its order.
      if (err instanceof DuplicateRazorpayOrderError) {
        const existing = await this.orders.findByRazorpayOrderId(err.razorpayOrderId);
        if (existing) return toOrderResponse(existing);
      }
      throw err;
    }

    await Promise.all(priced.items.map((item) => this.products.incrementSold(item.productId, item.quantity)));
    const response = toOrderResponse(order);
    void this.sendConfirmationEmail(response, userId);
    void this.sendAdminNotification(response, priced.settings.notificationEmail);
    if (warnings.length) {
      logger.warn({ orderNumber: response.orderNumber, warnings }, '[order] Paid order placed with problems');
    }
    return response;
  }

  /**
   * Customer → us, after paying a UPI order from their UPI app: records the UTR so the admin can
   * match it in the bank. Can be resubmitted (to fix a typo) until the admin verifies the payment.
   */
  async submitUpiPayment(input: SubmitUpiPaymentInput): Promise<OrderResponse> {
    const order = await this.orders.findByOrderNumberAndPhone(input.orderNumber, input.phone);
    if (!order) throw AppError.notFound('Order not found');
    if (order.paymentMethod !== PaymentMethod.Upi) {
      throw AppError.badRequest('This order is not a UPI payment order');
    }
    if (order.status === OrderStatus.Cancelled) throw AppError.badRequest('This order has been cancelled');
    if (order.paymentStatus === PaymentStatus.Paid) {
      throw AppError.badRequest('The payment for this order has already been verified');
    }
    if (order.upiReference === input.upiReference && order.paymentStatus === PaymentStatus.Pending) {
      return toOrderResponse(order);
    }

    let updated: OrderEntity | null;
    try {
      updated = await this.orders.submitUpiReference(order.id, input.upiReference, [
        PaymentStatus.Pending,
        PaymentStatus.Failed,
      ]);
    } catch (err) {
      if (err instanceof DuplicateUpiReferenceError) {
        throw AppError.conflict('This UPI transaction ID has already been used for another order');
      }
      throw err;
    }
    // Verified (or cancelled) by the admin in the moment since we read it.
    if (!updated) throw AppError.conflict('This order can no longer accept a payment reference');

    const response = toOrderResponse(updated);
    const { notificationEmail } = await this.settingsRepo.get();
    if (notificationEmail) {
      void this.email
        .sendAdminUpiPaymentSubmitted(notificationEmail, response)
        .catch((err) => logger.error({ err, orderNumber: response.orderNumber }, '[order] Failed to send UPI payment alert'));
    }
    return response;
  }

  /** Admin → verify (money is in the account) or reject a UPI payment; the customer is emailed either way. */
  async reviewPayment(id: string, input: ReviewPaymentInput): Promise<OrderResponse> {
    const order = await this.orders.findById(id);
    if (!order) throw AppError.notFound('Order not found');
    if (order.paymentMethod !== PaymentMethod.Upi) {
      throw AppError.badRequest('Only UPI payments are verified by hand');
    }
    if (order.status === OrderStatus.Cancelled) throw AppError.badRequest('This order has been cancelled');

    const verify = input.action === 'verify';
    // A rejected payment can still be verified later (e.g. the credit showed up late).
    const from = verify ? [PaymentStatus.Pending, PaymentStatus.Failed] : [PaymentStatus.Pending];
    const updated = await this.orders.setUpiPaymentStatus(id, from, verify ? PaymentStatus.Paid : PaymentStatus.Failed);
    if (!updated) {
      throw AppError.conflict(
        verify ? 'This payment has already been verified' : 'Only a payment awaiting verification can be rejected',
      );
    }

    const response = toOrderResponse(updated);
    void this.sendPaymentReviewEmail(response, updated.userId, verify, input.reason ?? '');
    return response;
  }

  /** Refunds a Razorpay payment, fully (default) or partially. */
  async refund(id: string, input: RefundOrderInput): Promise<OrderResponse> {
    const order = await this.orders.findById(id);
    if (!order) throw AppError.notFound('Order not found');
    if (order.paymentMethod !== PaymentMethod.Razorpay || !order.razorpayPaymentId) {
      throw AppError.badRequest('Only orders paid online can be refunded here');
    }
    if (order.paymentStatus !== PaymentStatus.Paid) {
      throw AppError.badRequest('This order has no captured payment left to refund');
    }

    const remaining = Math.round((order.total - (order.refundedAmount ?? 0)) * 100) / 100;
    const amount = input.amount ?? remaining;
    if (amount > remaining) {
      throw AppError.badRequest(`You can refund at most ₹${remaining} on this order`);
    }

    const settings = await this.settingsRepo.get();
    if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
      throw AppError.badRequest('Razorpay keys are not configured in Settings');
    }
    await refundRazorpayPayment(
      order.razorpayPaymentId,
      Math.round(amount * 100),
      settings.razorpayKeyId,
      settings.razorpayKeySecret,
    );

    const updated = await this.orders.recordRefund(id, amount, amount >= remaining);
    if (!updated) throw AppError.notFound('Order not found');
    return toOrderResponse(updated);
  }

  async list(query: OrderQuery): Promise<{ items: OrderResponse[]; total: number }> {
    const result = await this.orders.list(
      { status: query.status, search: query.search },
      { page: query.page, limit: query.limit },
    );
    return { items: result.items.map(toOrderResponse), total: result.total };
  }

  async listMine(userId: string, pagination: Pagination): Promise<{ items: OrderResponse[]; total: number }> {
    const result = await this.orders.list({ userId }, pagination);
    return { items: result.items.map(toOrderResponse), total: result.total };
  }

  async getById(id: string): Promise<OrderResponse> {
    const order = await this.orders.findById(id);
    if (!order) throw AppError.notFound('Order not found');
    return toOrderResponse(order);
  }

  async track(orderNumber: string, phone: string): Promise<OrderResponse> {
    const order = await this.orders.findByOrderNumberAndPhone(orderNumber, phone);
    if (!order) throw AppError.notFound('Order not found');
    return toOrderResponse(order);
  }

  async getMine(userId: string, orderNumber: string): Promise<OrderResponse> {
    const order = await this.orders.findByOrderNumberForUser(orderNumber, userId);
    if (!order) throw AppError.notFound('Order not found');
    return toOrderResponse(order);
  }

  async updateStatus(id: string, input: UpdateOrderStatusInput): Promise<OrderResponse> {
    const previous = await this.orders.findById(id);
    if (!previous) throw AppError.notFound('Order not found');
    // Re-saving the same status would add a duplicate tracking event and re-email the customer.
    if (previous.status === input.status) return toOrderResponse(previous);

    if (input.status === OrderStatus.Cancelled && previous.status !== OrderStatus.Cancelled) {
      await this.releaseReservations(previous);
    }

    const updated = await this.orders.updateStatus(id, input.status);
    if (!updated) throw AppError.notFound('Order not found');
    const response = toOrderResponse(updated);
    void this.sendStatusUpdateEmail(response, updated.userId);
    return response;
  }

  /**
   * Cancels UPI orders whose payment window ran out without the customer entering a transaction
   * ID, putting their stock and coupon back. Orders with a UTR are left for the admin to review.
   * Safe to run from several instances at once — each order is cancelled at most once.
   */
  async cancelOverdueUpiOrders(now = new Date()): Promise<number> {
    const ids = await this.orders.findOverdueUpiOrderIds(now);
    let cancelled = 0;
    for (const id of ids) {
      const order = await this.orders.cancelIfAwaitingUpiPayment(id, now);
      if (!order) continue;
      cancelled++;
      await this.releaseReservations(order);
      void this.sendUnpaidCancelledEmail(toOrderResponse(order), order.userId);
      logger.info({ orderNumber: order.orderNumber }, '[order] Unpaid UPI order cancelled automatically');
    }
    return cancelled;
  }

  /** Made-to-order items never took stock, so only regular items go back on the shelf. */
  private async releaseReservations(order: OrderEntity): Promise<void> {
    await Promise.all(
      order.items
        .filter((item) => !item.isBuildOrder)
        .map((item) => this.products.incrementStock(item.productId, item.quantity)),
    );
    if (order.couponCode) await this.coupons.release(order.couponCode);
  }

  async setBuildEta(id: string, estimatedReadyDate: Date): Promise<OrderResponse> {
    const updated = await this.orders.setBuildEta(id, estimatedReadyDate);
    if (!updated) throw AppError.notFound('Order not found');
    const response = toOrderResponse(updated);
    void this.sendBuildEtaEmail(response, updated.userId);
    return response;
  }

  /** Best-effort: an email failure should never fail order placement. */
  private async sendConfirmationEmail(order: OrderResponse, userId?: string): Promise<void> {
    try {
      const recipient = await this.resolveRecipient(order, userId);
      if (!recipient) return;
      await this.email.sendOrderConfirmation(recipient, order);
    } catch (err) {
      logger.error({ err, orderNumber: order.orderNumber }, '[order] Failed to send confirmation email');
    }
  }

  /** Best-effort: notifies the customer whenever admin changes their order's status. */
  private async sendStatusUpdateEmail(order: OrderResponse, userId?: string | null): Promise<void> {
    try {
      const recipient = await this.resolveRecipient(order, userId ?? undefined);
      if (!recipient) return;
      await this.email.sendOrderStatusUpdate(recipient, order);
    } catch (err) {
      logger.error({ err, orderNumber: order.orderNumber }, '[order] Failed to send status update email');
    }
  }

  /** Best-effort: notifies the customer once admin decides the build timeline. */
  private async sendBuildEtaEmail(order: OrderResponse, userId?: string | null): Promise<void> {
    try {
      const recipient = await this.resolveRecipient(order, userId ?? undefined);
      if (!recipient) return;
      await this.email.sendBuildEtaUpdate(recipient, order);
    } catch (err) {
      logger.error({ err, orderNumber: order.orderNumber }, '[order] Failed to send build ETA email');
    }
  }

  /** Best-effort: tells the customer the admin verified (or couldn't find) their UPI payment. */
  private async sendPaymentReviewEmail(
    order: OrderResponse,
    userId: string | null | undefined,
    verified: boolean,
    reason: string,
  ): Promise<void> {
    try {
      const recipient = await this.resolveRecipient(order, userId ?? undefined);
      if (!recipient) return;
      if (verified) await this.email.sendPaymentVerified(recipient, order);
      else await this.email.sendPaymentRejected(recipient, order, reason);
    } catch (err) {
      logger.error({ err, orderNumber: order.orderNumber }, '[order] Failed to send payment review email');
    }
  }

  /** Best-effort: tells the customer their unpaid UPI order was cancelled automatically. */
  private async sendUnpaidCancelledEmail(order: OrderResponse, userId?: string | null): Promise<void> {
    try {
      const recipient = await this.resolveRecipient(order, userId ?? undefined);
      if (!recipient) return;
      await this.email.sendUnpaidOrderCancelled(recipient, order);
    } catch (err) {
      logger.error({ err, orderNumber: order.orderNumber }, '[order] Failed to send unpaid-cancel email');
    }
  }

  /** Best-effort: alerts the admin notification inbox (if configured) that an order came in. */
  private async sendAdminNotification(order: OrderResponse, notificationEmail?: string): Promise<void> {
    if (!notificationEmail) return;
    try {
      await this.email.sendAdminOrderNotification(notificationEmail, order);
    } catch (err) {
      logger.error({ err, orderNumber: order.orderNumber }, '[order] Failed to send admin order notification');
    }
  }

  private async resolveRecipient(order: OrderResponse, userId?: string): Promise<string | undefined> {
    if (order.customerEmail) return order.customerEmail;
    if (!userId) return undefined;
    return (await this.users.findById(userId))?.email;
  }
}
