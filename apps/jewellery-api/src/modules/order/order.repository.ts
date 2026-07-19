import type { OrderStatus, PaymentMethod, PaymentStatus } from '@lorka/types';
import type { OrderEntity } from '../../common/interfaces/entities';
import type {
  IOrderRepository,
  OrderFilter,
  CreateOrderData,
  PagedResult,
  Pagination,
} from '../../common/interfaces/repositories';
import { OrderModel, type OrderDocument } from './order.model';

function toEntity(doc: OrderDocument): OrderEntity {
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    userId: doc.userId ? doc.userId.toString() : null,
    status: doc.status as OrderStatus,
    paymentMethod: doc.paymentMethod as PaymentMethod,
    paymentStatus: doc.paymentStatus as PaymentStatus,
    razorpayOrderId: doc.razorpayOrderId || undefined,
    razorpayPaymentId: doc.razorpayPaymentId || undefined,
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
    charges: (doc.charges ?? []).map((c) => ({ name: c.name, amount: c.amount })),
    total: doc.total,
    notes: doc.notes || undefined,
    estimatedReadyDate: doc.estimatedReadyDate ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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

  async existsByOrderNumber(orderNumber: string): Promise<boolean> {
    return (await OrderModel.countDocuments({ orderNumber }).exec()) > 0;
  }

  async create(data: CreateOrderData): Promise<OrderEntity> {
    const doc = await OrderModel.create(data);
    return toEntity(doc.toObject() as OrderDocument);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderEntity | null> {
    const doc = await OrderModel.findByIdAndUpdate(id, { status }, { new: true })
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
