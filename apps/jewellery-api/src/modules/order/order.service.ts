import { OrderStatus, PaymentMethod, PaymentStatus } from '@lorka/types';
import type { CreateOrderInput, UpdateOrderStatusInput, OrderQuery, OrderResponse } from '@lorka/types';
import type { OrderEntity } from '../../common/interfaces/entities';
import type {
  IOrderRepository,
  IProductRepository,
  IUserRepository,
  ISettingsRepository,
  Pagination,
} from '../../common/interfaces/repositories';
import type { IEmailService } from '../../common/interfaces/services';
import { AppError } from '../../common/errors/app-error';
import { generateUniqueOrderNumber } from '../../common/utils/order-number';
import { computeCharges, sumCharges } from '../../common/utils/pricing';
import { verifyRazorpaySignature } from '../payment/razorpay.client';
import { logger } from '../../common/logger/logger';

export function toOrderResponse(order: OrderEntity): OrderResponse {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
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
    charges: order.charges,
    total: order.total,
    notes: order.notes,
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
  ) {}

  async create(input: CreateOrderInput, userId?: string): Promise<OrderResponse> {
    if (input.paymentMethod === PaymentMethod.Razorpay) {
      const valid =
        input.razorpayOrderId &&
        input.razorpayPaymentId &&
        input.razorpaySignature &&
        verifyRazorpaySignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
      if (!valid) {
        throw AppError.badRequest('Payment verification failed');
      }
    }

    const products = await Promise.all(input.items.map((item) => this.products.findById(item.productId)));

    const resolvedItems = input.items.map((item, idx) => {
      const product = products[idx];
      if (!product || !product.isActive) {
        throw AppError.badRequest('One of the selected products is no longer available');
      }
      // Build-on-request items are made to order, so the current stock count doesn't gate them.
      if (!item.isBuildOrder && product.stock < item.quantity) {
        throw AppError.conflict(`${product.name} only has ${product.stock} left in stock`);
      }
      const unitPrice = product.discountPrice ?? product.price;
      return {
        productId: product.id,
        name: product.name,
        image: product.images[0] ?? '',
        unitPrice,
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity,
        isBuildOrder: item.isBuildOrder,
      };
    });

    const decremented: { productId: string; quantity: number }[] = [];
    try {
      for (const item of resolvedItems) {
        if (item.isBuildOrder) continue;
        const ok = await this.products.decrementStock(item.productId, item.quantity);
        if (!ok) {
          throw AppError.conflict(`${item.name} is no longer available in the requested quantity`);
        }
        decremented.push({ productId: item.productId, quantity: item.quantity });
      }
    } catch (err) {
      await Promise.all(decremented.map((d) => this.products.incrementStock(d.productId, d.quantity)));
      throw err;
    }

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const settings = await this.settingsRepo.get();
    const charges = computeCharges(subtotal, settings.charges);
    const total = subtotal + sumCharges(charges);

    try {
      const orderNumber = await generateUniqueOrderNumber((candidate) =>
        this.orders.existsByOrderNumber(candidate),
      );
      const paymentMethod = input.paymentMethod ?? PaymentMethod.Cod;
      const order = await this.orders.create({
        orderNumber,
        userId: userId ?? null,
        status: OrderStatus.Pending,
        paymentMethod,
        paymentStatus: paymentMethod === PaymentMethod.Razorpay ? PaymentStatus.Paid : PaymentStatus.Pending,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        shippingAddress: input.shippingAddress,
        items: resolvedItems,
        subtotal,
        charges,
        total,
        notes: input.notes,
      });
      const response = toOrderResponse(order);
      void this.sendConfirmationEmail(response, userId);
      void this.sendAdminNotification(response, settings.notificationEmail);
      return response;
    } catch (err) {
      await Promise.all(
        resolvedItems
          .filter((item) => !item.isBuildOrder)
          .map((item) => this.products.incrementStock(item.productId, item.quantity)),
      );
      throw err;
    }
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

  async updateStatus(id: string, input: UpdateOrderStatusInput): Promise<OrderResponse> {
    const previous = await this.orders.findById(id);
    if (!previous) throw AppError.notFound('Order not found');

    if (input.status === OrderStatus.Cancelled && previous.status !== OrderStatus.Cancelled) {
      await Promise.all(
        previous.items.map((item) => this.products.incrementStock(item.productId, item.quantity)),
      );
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
