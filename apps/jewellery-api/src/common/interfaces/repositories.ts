import type { UserRole, OrderStatus, TicketStatus, ChargeType } from '@lorka/types';
import type {
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
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
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
  existsByOrderNumber(orderNumber: string): Promise<boolean>;
  create(data: CreateOrderData): Promise<OrderEntity>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderEntity | null>;
  setBuildEta(id: string, estimatedReadyDate: Date): Promise<OrderEntity | null>;
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
  notificationEmail?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
}

export interface ISettingsRepository {
  get(): Promise<SettingsEntity>;
  update(data: UpdateSettingsData): Promise<SettingsEntity>;
}
