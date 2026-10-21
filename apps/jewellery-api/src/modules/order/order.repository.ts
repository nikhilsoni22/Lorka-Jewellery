import { OrderStatus, PaymentMethod, PaymentStatus } from '@lorka/types';
import type { OrderEntity } from '../../common/interfaces/entities';
import {
  DuplicateRazorpayOrderError,
  DuplicateUpiReferenceError,
  type IOrderRepository,
  type OrderFilter,
  type CreateOrderData,
  type PagedResult,
  type Pagination,
} from '../../common/interfaces/repositories';
import { OrderModel, type OrderDocument } from './order.model';

function toEntity(doc: OrderDocument): OrderEntity {
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    userId: doc.userId ? doc.userId.toString() : null,
    status: doc.status as OrderStatus,
    statusHistory: (doc.statusHistory ?? []).map((e) => ({ status: e.status as OrderStatus, at: e.at })),
    paymentMethod: doc.paymentMethod as PaymentMethod,
    paymentStatus: doc.paymentStatus as PaymentStatus,
    razorpayOrderId: doc.razorpayOrderId || undefined,
    razorpayPaymentId: doc.razorpayPaymentId || undefined,
    upiReference: doc.upiReference || undefined,
    upiSubmittedAt: doc.upiSubmittedAt ?? null,
    upiPaymentDueAt: doc.upiPaymentDueAt ?? null,
    paymentVerifiedAt: doc.paymentVerifiedAt ?? null,
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    customerEmail: doc.customerEmail || undefined,
    shippingAddress: {
      line1: doc.shippingAddress.line1,
      line2: doc.shippingAddress.line2 || undefined,
      city: doc.shippingAddress.city,
      state: doc.shippingAddress.state,
      postalCode: doc.shippingAddress.postalCode,
      country: doc.shippingAddress.country,
      location: doc.shippingAddress.location ?? null,
    },
    items: doc.items.map((item) => ({
      productId: item.productId.toString(),
      name: item.name,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      isBuildOrder: item.isBuildOrder ?? false,
    })),
    subtotal: doc.subtotal,
    couponCode: doc.couponCode || undefined,
    discount: doc.discount ?? 0,
    charges: (doc.charges ?? []).map((c) => ({ name: c.name, amount: c.amount })),
    total: doc.total,
    notes: doc.notes || undefined,
    giftWrap: doc.giftWrap ?? false,
    giftMessage: doc.giftMessage || undefined,
    refundedAmount: doc.refundedAmount ?? 0,
    refundedAt: doc.refundedAt ?? null,
    estimatedReadyDate: doc.estimatedReadyDate ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** A UPI order past its payment deadline that the customer never entered a transaction ID for. */
function awaitingUpiPayment(now: Date) {
  return {
    paymentMethod: PaymentMethod.Upi,
    status: OrderStatus.Pending,
    paymentStatus: PaymentStatus.Pending,
    upiReference: { $in: ['', null] },
    upiPaymentDueAt: { $ne: null, $lte: now },
  };
}

export class OrderRepository implements IOrderRepository {
  async list(filter: OrderFilter, pagination: Pagination): Promise<PagedResult<OrderEntity>> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.userId) query.userId = filter.userId;
    if (filter.search) {
      const regex = { $regex: filter.search, $options: 'i' };
      query.$or = [{ orderNumber: regex }, { customerName: regex }, { customerPhone: regex }];
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [docs, total] = await Promise.all([
      OrderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .lean<OrderDocument[]>()
        .exec(),
      OrderModel.countDocuments(query).exec(),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findById(id).lean<OrderDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOrderNumberAndPhone(orderNumber: string, phone: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOne({ orderNumber, customerPhone: phone }).lean<OrderDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOrderNumberForUser(orderNumber: string, userId: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOne({ orderNumber, userId }).lean<OrderDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async existsByOrderNumber(orderNumber: string): Promise<boolean> {
    return (await OrderModel.countDocuments({ orderNumber }).exec()) > 0;
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOne({ razorpayOrderId }).lean<OrderDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateOrderData): Promise<OrderEntity> {
    try {
      const doc = await OrderModel.create(data);
      return toEntity(doc.toObject() as OrderDocument);
    } catch (err) {
      const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
      if (mongoErr.code === 11000 && mongoErr.keyPattern?.razorpayOrderId && data.razorpayOrderId) {
        throw new DuplicateRazorpayOrderError(data.razorpayOrderId);
      }
      throw err;
    }
  }

  async findByUpiReference(upiReference: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOne({ upiReference }).lean<OrderDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async submitUpiReference(id: string, upiReference: string, from: PaymentStatus[]): Promise<OrderEntity | null> {
    try {
      const doc = await OrderModel.findOneAndUpdate(
        { _id: id, paymentMethod: PaymentMethod.Upi, paymentStatus: { $in: from }, status: { $ne: OrderStatus.Cancelled } },
        { $set: { upiReference, upiSubmittedAt: new Date(), paymentStatus: PaymentStatus.Pending } },
        { new: true },
      )
        .lean<OrderDocument>()
        .exec();
      return doc ? toEntity(doc) : null;
    } catch (err) {
      const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
      if (mongoErr.code === 11000 && mongoErr.keyPattern?.upiReference) {
        throw new DuplicateUpiReferenceError(upiReference);
      }
      throw err;
    }
  }

  async findOverdueUpiOrderIds(now: Date): Promise<string[]> {
    const docs = await OrderModel.find(awaitingUpiPayment(now), { _id: 1 }).lean().exec();
    return docs.map((d) => d._id.toString());
  }

  async cancelIfAwaitingUpiPayment(id: string, now: Date): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOneAndUpdate(
      { _id: id, ...awaitingUpiPayment(now) },
      {
        $set: { status: OrderStatus.Cancelled },
        $push: { statusHistory: { status: OrderStatus.Cancelled, at: now } },
      },
      { new: true },
    )
      .lean<OrderDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async setUpiPaymentStatus(id: string, from: PaymentStatus[], to: PaymentStatus): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOneAndUpdate(
      { _id: id, paymentMethod: PaymentMethod.Upi, paymentStatus: { $in: from } },
      { $set: { paymentStatus: to, paymentVerifiedAt: to === PaymentStatus.Paid ? new Date() : null } },
      { new: true },
    )
      .lean<OrderDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async recordRefund(id: string, amount: number, fullyRefunded: boolean): Promise<OrderEntity | null> {
    const doc = await OrderModel.findByIdAndUpdate(
      id,
      {
        $inc: { refundedAmount: amount },
        $set: { refundedAt: new Date(), ...(fullyRefunded ? { paymentStatus: PaymentStatus.Refunded } : {}) },
      },
      { new: true },
    )
      .lean<OrderDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async hasDeliveredProduct(userId: string, productId: string): Promise<boolean> {
    const count = await OrderModel.countDocuments({
      userId,
      status: OrderStatus.Delivered,
      'items.productId': productId,
    }).exec();
    return count > 0;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderEntity | null> {
    const doc = await OrderModel.findByIdAndUpdate(
      id,
      { $set: { status }, $push: { statusHistory: { status, at: new Date() } } },
      { new: true },
    )
      .lean<OrderDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async setBuildEta(id: string, estimatedReadyDate: Date): Promise<OrderEntity | null> {
    const doc = await OrderModel.findByIdAndUpdate(id, { estimatedReadyDate }, { new: true })
      .lean<OrderDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }
}
