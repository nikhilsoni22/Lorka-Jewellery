import { OrderStatus, PaymentMethod, PaymentStatus } from '@lorka/types';
import type {
  CheckoutDetailsInput,
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderQuery,
  OrderResponse,
  RefundOrderInput,
} from '@lorka/types';
import type { OrderEntity } from '../../common/interfaces/entities';
import {
  DuplicateRazorpayOrderError,
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
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    shippingAddress: order.shippingAddress,
    items: order.items,
    subtotal: order.subtotal,
    couponCode: order.couponCode,
    discount: order.discount,
    charges: order.charges,
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
    const settings = await this.settingsRepo.get();
    const method = input.paymentMethod ?? PaymentMethod.Cod;

    if (method === PaymentMethod.Cod && !settings.paymentMethods.codEnabled) {
      throw AppError.badRequest('Cash on delivery is currently unavailable. Please choose another payment method.');
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
      return this.place(input, userId, { razorpayOrderId: input.razorpayOrderId!, razorpayPaymentId: input.razorpayPaymentId! });
    }
    return this.place(input, userId);
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
    return this.place(input, userId ?? undefined, payment);
  }

  private async place(
    input: CheckoutDetailsInput,
    userId: string | undefined,
    payment?: { razorpayOrderId: string; razorpayPaymentId: string },
  ): Promise<OrderResponse> {
    const paid = Boolean(payment);
    if (payment) {
      const existing = await this.orders.findByRazorpayOrderId(payment.razorpayOrderId);
      if (existing) return toOrderResponse(existing);
    }

    const priced = await this.pricer.price(input, paid);
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
        paymentMethod: paid ? PaymentMethod.Razorpay : PaymentMethod.Cod,
        paymentStatus: paid ? PaymentStatus.Paid : PaymentStatus.Pending,
        razorpayOrderId: payment?.razorpayOrderId,
        razorpayPaymentId: payment?.razorpayPaymentId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        shippingAddress: input.shippingAddress,
        items: priced.items,
        subtotal: priced.subtotal,
        couponCode: priced.couponCode,
        discount: priced.discount,
        charges: priced.charges,
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
      // Made-to-order items never took stock, so only regular items go back on the shelf.
      await Promise.all(
        previous.items
          .filter((item) => !item.isBuildOrder)
          .map((item) => this.products.incrementStock(item.productId, item.quantity)),
      );
      if (previous.couponCode) await this.coupons.release(previous.couponCode);
    }

    const updated = await this.orders.updateStatus(id, input.status);
    if (!updated) throw AppError.notFound('Order not found');
    const response = toOrderResponse(updated);
    void this.sendStatusUpdateEmail(response, updated.userId);
    return response;
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
