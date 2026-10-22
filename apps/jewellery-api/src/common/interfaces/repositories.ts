import type {
  UserRole,
  OrderStatus,
  PaymentStatus,
  TicketStatus,
  ChargeType,
  MetalType,
  ProductSort,
  StoreInfoResponse,
  PoliciesResponse,
  PaymentPricing,
} from '@lorka/types';
import type {
  CouponEntity,
  ReviewEntity,
  PendingCheckoutEntity,
  UserEntity,
  RefreshTokenEntity,
  AuditLogEntity,
  CategoryEntity,
  ProductEntity,
  BannerEntity,
  OrderEntity,
  TicketEntity,
  SettingsEntity,
  MaintenanceEntity,
  PaymentMethodsEntity,
} from './entities';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerified?: boolean;
}

export interface UserFilter {
  role?: UserRole;
  isBlocked?: boolean;
  search?: string;
}

export interface IUserRepository {
  list(filter: UserFilter, pagination: Pagination): Promise<PagedResult<UserEntity>>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByValidResetToken(tokenHash: string, now: Date): Promise<UserEntity | null>;
  updatePasswordAndClearReset(userId: string, passwordHash: string): Promise<void>;
  setEmailOtp(userId: string, otpHash: string, expiresAt: Date): Promise<void>;
  /** Atomically verifies + consumes the OTP if it matches and hasn't expired; returns whether it succeeded. */
  consumeEmailOtpIfValid(userId: string, otpHash: string, now: Date): Promise<boolean>;
  markEmailVerified(userId: string): Promise<void>;
  setBlocked(userId: string, blocked: boolean, reason: string): Promise<UserEntity | null>;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<RefreshTokenEntity>;
  findActiveByHash(tokenHash: string, now: Date): Promise<RefreshTokenEntity | null>;
  revoke(id: string, replacedByTokenHash?: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export type AuditLogInput = Omit<AuditLogEntity, 'id' | 'createdAt'>;

export interface IAuditLogRepository {
  record(entry: AuditLogInput): Promise<void>;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface Pagination {
  page: number;
  limit: number;
}

// --- Category ---------------------------------------------------------------

export type CreateCategoryData = Omit<CategoryEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCategoryData = Partial<CreateCategoryData>;

export interface CategoryFilter {
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string;
}

export interface ICategoryRepository {
  list(filter: CategoryFilter, pagination: Pagination): Promise<PagedResult<CategoryEntity>>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  update(id: string, data: UpdateCategoryData): Promise<CategoryEntity | null>;
  delete(id: string): Promise<boolean>;
}

// --- Product ------------------------------------------------------------------

export type CreateProductData = Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductData = Partial<CreateProductData>;

export interface ProductFilter {
  category?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string;
  sort?: ProductSort;
  /** Bounds on the live (pre-offer) price. */
  minPrice?: number;
  maxPrice?: number;
  metalType?: MetalType;
  inStock?: boolean;
}

/** Current admin-set metal rates, needed to sort/derive products by their live price. */
export interface MetalRates {
  silverRatePerKg: number;
  goldRatePer10g: number;
}

export interface IProductRepository {
  list(filter: ProductFilter, pagination: Pagination, rates: MetalRates): Promise<PagedResult<ProductEntity>>;
  findById(id: string): Promise<ProductEntity | null>;
  findBySlug(slug: string): Promise<ProductEntity | null>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  existsBySku(sku: string, excludeId?: string): Promise<boolean>;
  create(data: CreateProductData): Promise<ProductEntity>;
  update(id: string, data: UpdateProductData): Promise<ProductEntity | null>;
  delete(id: string): Promise<boolean>;
  /** Atomically decrements stock only if enough is available; returns false if not. */
  decrementStock(id: string, quantity: number): Promise<boolean>;
  incrementStock(id: string, quantity: number): Promise<void>;
  incrementSold(id: string, quantity: number): Promise<void>;
  setRating(id: string, ratingAvg: number, ratingCount: number): Promise<void>;
}

// --- Banner ---------------------------------------------------------------------

export type CreateBannerData = Omit<BannerEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBannerData = Partial<CreateBannerData>;

export interface BannerFilter {
  placement?: string;
  isActive?: boolean;
  /** When true, only banners within their active date window (or with no dates) are returned. */
  onlyLive?: boolean;
}

export interface IBannerRepository {
  list(filter: BannerFilter): Promise<BannerEntity[]>;
  findById(id: string): Promise<BannerEntity | null>;
  create(data: CreateBannerData): Promise<BannerEntity>;
  update(id: string, data: UpdateBannerData): Promise<BannerEntity | null>;
  delete(id: string): Promise<boolean>;
}

// --- Order ------------------------------------------------------------------

export type CreateOrderData = Omit<OrderEntity, 'id' | 'createdAt' | 'updatedAt'>;

export interface OrderFilter {
  status?: OrderStatus;
  search?: string;
  userId?: string;
}

export interface IOrderRepository {
  list(filter: OrderFilter, pagination: Pagination): Promise<PagedResult<OrderEntity>>;
  findById(id: string): Promise<OrderEntity | null>;
  findByOrderNumberAndPhone(orderNumber: string, phone: string): Promise<OrderEntity | null>;
  findByOrderNumberForUser(orderNumber: string, userId: string): Promise<OrderEntity | null>;
  findByRazorpayOrderId(razorpayOrderId: string): Promise<OrderEntity | null>;
  existsByOrderNumber(orderNumber: string): Promise<boolean>;
  create(data: CreateOrderData): Promise<OrderEntity>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderEntity | null>;
  setBuildEta(id: string, estimatedReadyDate: Date): Promise<OrderEntity | null>;
  findByUpiReference(upiReference: string): Promise<OrderEntity | null>;
  /**
   * Records the customer's "I have paid" (and their UTR, if given) on a UPI order whose payment is
   * still `from` one of the given statuses, putting it (back) to pending verification. Null if the
   * order isn't in that state. Throws `DuplicateUpiReferenceError` if another order has this UTR.
   */
  submitUpiReference(id: string, upiReference: string | undefined, from: PaymentStatus[]): Promise<OrderEntity | null>;
  /** UPI orders past `upiPaymentDueAt` the customer never said they paid (see `cancelIfAwaitingUpiPayment`). */
  findOverdueUpiOrderIds(now: Date): Promise<string[]>;
  /**
   * Cancels the order only if it is still an overdue UPI order the customer never said they paid —
   * atomic, so an "I have paid" at the same moment always wins. Null if it no longer qualifies.
   */
  cancelIfAwaitingUpiPayment(id: string, now: Date): Promise<OrderEntity | null>;
  /** Moves a UPI order's payment from one of `from` to `to` (the admin's verify / reject). */
  setUpiPaymentStatus(id: string, from: PaymentStatus[], to: PaymentStatus): Promise<OrderEntity | null>;
  /** Adds `amount` to the refunded total; `fullyRefunded` flips paymentStatus to refunded. */
  recordRefund(id: string, amount: number, fullyRefunded: boolean): Promise<OrderEntity | null>;
  /** Whether the user has a delivered order containing this product (verified-buyer reviews). */
  hasDeliveredProduct(userId: string, productId: string): Promise<boolean>;
}

/** Thrown by `IOrderRepository.create` when an order already exists for that Razorpay order. */
export class DuplicateRazorpayOrderError extends Error {
  constructor(readonly razorpayOrderId: string) {
    super(`An order already exists for Razorpay order ${razorpayOrderId}`);
  }
}

/** Thrown by `IOrderRepository.submitUpiReference` when the UTR already paid for another order. */
export class DuplicateUpiReferenceError extends Error {
  constructor(readonly upiReference: string) {
    super(`UPI reference ${upiReference} is already used by another order`);
  }
}

// --- Pending checkout -----------------------------------------------------------

export type CreatePendingCheckoutData = Omit<PendingCheckoutEntity, 'id' | 'createdAt'>;

export interface IPendingCheckoutRepository {
  create(data: CreatePendingCheckoutData): Promise<PendingCheckoutEntity>;
  findByRazorpayOrderId(razorpayOrderId: string): Promise<PendingCheckoutEntity | null>;
}

// --- Coupon ---------------------------------------------------------------------

export type CreateCouponData = Omit<CouponEntity, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>;
export type UpdateCouponData = Partial<CreateCouponData>;

export interface ICouponRepository {
  list(pagination: Pagination): Promise<PagedResult<CouponEntity>>;
  findById(id: string): Promise<CouponEntity | null>;
  findByCode(code: string): Promise<CouponEntity | null>;
  create(data: CreateCouponData): Promise<CouponEntity>;
  update(id: string, data: UpdateCouponData): Promise<CouponEntity | null>;
  delete(id: string): Promise<boolean>;
  /** Atomically counts one use, only while under the usage limit; returns false if exhausted. */
  redeem(code: string): Promise<boolean>;
  /** Counts a use regardless of the limit — for already-paid orders, which must go through. */
  forceRedeem(code: string): Promise<void>;
  release(code: string): Promise<void>;
}

// --- Review ---------------------------------------------------------------------

export type CreateReviewData = Omit<ReviewEntity, 'id' | 'createdAt' | 'updatedAt'>;

export interface ReviewFilter {
  productId?: string;
  isVisible?: boolean;
  search?: string;
}

export interface IReviewRepository {
  list(filter: ReviewFilter, pagination: Pagination): Promise<PagedResult<ReviewEntity>>;
  findById(id: string): Promise<ReviewEntity | null>;
  findByUserAndProduct(userId: string, productId: string): Promise<ReviewEntity | null>;
  create(data: CreateReviewData): Promise<ReviewEntity>;
  setVisible(id: string, isVisible: boolean): Promise<ReviewEntity | null>;
  delete(id: string): Promise<ReviewEntity | null>;
  /** Visible-review rating counts for a product, index 0 = 1 star … index 4 = 5 stars. */
  ratingDistribution(productId: string): Promise<[number, number, number, number, number]>;
}

// --- Ticket -------------------------------------------------------------------

export type CreateTicketData = Omit<TicketEntity, 'id' | 'createdAt' | 'updatedAt'>;

export interface TicketFilter {
  status?: TicketStatus;
  userId?: string;
  search?: string;
}

export interface ITicketRepository {
  list(filter: TicketFilter, pagination: Pagination): Promise<PagedResult<TicketEntity>>;
  findById(id: string): Promise<TicketEntity | null>;
  create(data: CreateTicketData): Promise<TicketEntity>;
  updateStatus(id: string, status: TicketStatus): Promise<TicketEntity | null>;
}

// --- Settings -------------------------------------------------------------------

export interface UpdateChargeData {
  id?: string;
  name: string;
  type: ChargeType;
  value: number;
  isActive: boolean;
}

export type UpdateMaintenanceData = MaintenanceEntity;

export interface UpdateSettingsData {
  silverRatePerKg: number;
  goldRatePer10g: number;
  charges: UpdateChargeData[];
  maintenance: UpdateMaintenanceData;
  paymentMethods: PaymentMethodsEntity;
  /** Undefined = leave the saved value unchanged. */
  paymentPricing?: PaymentPricing;
  notificationEmail?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  /** Undefined = leave the saved value unchanged. */
  storeInfo?: StoreInfoResponse;
  policies?: PoliciesResponse;
}

export interface ISettingsRepository {
  get(): Promise<SettingsEntity>;
  update(data: UpdateSettingsData): Promise<SettingsEntity>;
}
