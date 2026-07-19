export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export const ORDER_STATUSES = Object.values(OrderStatus);

export enum PaymentMethod {
  Cod = 'cod',
  Razorpay = 'razorpay',
}

export const PAYMENT_METHODS = Object.values(PaymentMethod);

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
}

export const PAYMENT_STATUSES = Object.values(PaymentStatus);
