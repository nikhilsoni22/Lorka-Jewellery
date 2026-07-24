import type {
  UserRole,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  TicketStatus,
  ChargeType,
  MetalType,
} from '@lorka/types';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isBlocked: boolean;
  emailVerified: boolean;
  resetTokenHash?: string | null;
  resetTokenExpires?: Date | null;
  otpHash?: string | null;
  otpExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenHash?: string | null;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
}

export interface AuditLogEntity {
  id: string;
  actorId?: string | null;
  action: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  sku: string;
  metalType: MetalType;
  makingCharge: number;
  discountPercent?: number | null;
  images: string[];
  material: string;
  purity: string;
  weight: number;
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemEntity {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isBuildOrder: boolean;
}

export interface ShippingAddressEntity {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderChargeEntity {
  name: string;
  amount: number;
}

export interface OrderEntity {
  id: string;
  orderNumber: string;
  userId?: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddressEntity;
  items: OrderItemEntity[];
  subtotal: number;
  charges: OrderChargeEntity[];
  total: number;
  notes?: string;
  estimatedReadyDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketEntity {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: TicketStatus;
  customerName: string;
  customerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChargeEntity {
  id: string;
  name: string;
  type: ChargeType;
  value: number;
  isActive: boolean;
}

export interface MaintenanceEntity {
  enabled: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  message: string;
}

export interface SettingsEntity {
  id: string;
  silverRatePerKg: number;
  goldRatePer10g: number;
  charges: ChargeEntity[];
  maintenance: MaintenanceEntity;
  notificationEmail?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BannerEntity {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
