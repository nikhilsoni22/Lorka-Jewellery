import type { UserEntity, RefreshTokenEntity } from '../../src/common/interfaces/entities';
import type {
  IUserRepository,
  IRefreshTokenRepository,
  IAuditLogRepository,
  CreateUserData,
  CreateRefreshTokenData,
  AuditLogInput,
  UserFilter,
  PagedResult,
  Pagination,
} from '../../src/common/interfaces/repositories';
import type { OrderResponse } from '@lorka/types';
import type { IEmailService } from '../../src/common/interfaces/services';

export class FakeUserRepository implements IUserRepository {
  private readonly byId = new Map<string, UserEntity>();
  private seq = 0;

  async list(filter: UserFilter, pagination: Pagination): Promise<PagedResult<UserEntity>> {
    let items = [...this.byId.values()];
    if (filter.role) items = items.filter((u) => u.role === filter.role);
    if (filter.isBlocked !== undefined) items = items.filter((u) => u.isBlocked === filter.isBlocked);
    if (filter.search) {
      const term = filter.search.toLowerCase();
      items = items.filter((u) => u.name.toLowerCase().includes(term) || u.email.includes(term));
    }
    const total = items.length;
    const start = (pagination.page - 1) * pagination.limit;
    const paged = items.slice(start, start + pagination.limit).map((u) => ({ ...u }));
    return { items: paged, total };
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const target = email.toLowerCase();
    for (const user of this.byId.values()) {
      if (user.email === target) return { ...user };
    }
    return null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const id = String(++this.seq);
    const now = new Date();
    const user: UserEntity = {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role,
      isBlocked: false,
      emailVerified: data.emailVerified ?? false,
      resetTokenHash: null,
      resetTokenExpires: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(id, user);
    return { ...user };
  }

  async setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const user = this.byId.get(userId);
    if (user) {
      user.resetTokenHash = tokenHash;
      user.resetTokenExpires = expiresAt;
    }
  }

  async findByValidResetToken(tokenHash: string, now: Date): Promise<UserEntity | null> {
    for (const user of this.byId.values()) {
      if (
        user.resetTokenHash === tokenHash &&
        user.resetTokenExpires &&
        user.resetTokenExpires > now
      ) {
        return { ...user };
      }
    }
    return null;
  }

  async updatePasswordAndClearReset(userId: string, passwordHash: string): Promise<void> {
    const user = this.byId.get(userId);
    if (user) {
      user.passwordHash = passwordHash;
      user.resetTokenHash = null;
      user.resetTokenExpires = null;
    }
  }

  async setEmailOtp(userId: string, otpHash: string, expiresAt: Date): Promise<void> {
    const user = this.byId.get(userId);
    if (user) {
      user.otpHash = otpHash;
      user.otpExpires = expiresAt;
    }
  }

  async consumeEmailOtpIfValid(userId: string, otpHash: string, now: Date): Promise<boolean> {
    const user = this.byId.get(userId);
    if (user && user.otpHash === otpHash && user.otpExpires && user.otpExpires > now) {
      user.emailVerified = true;
      user.otpHash = null;
      user.otpExpires = null;
      return true;
    }
    return false;
  }
}

export class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  private readonly tokens: RefreshTokenEntity[] = [];
  private seq = 0;

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenEntity> {
    const entity: RefreshTokenEntity = {
      id: String(++this.seq),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: data.userAgent,
      ip: data.ip,
      createdAt: new Date(),
    };
    this.tokens.push(entity);
    return { ...entity };
  }

  async findActiveByHash(tokenHash: string, now: Date): Promise<RefreshTokenEntity | null> {
    const found = this.tokens.find(
      (t) => t.tokenHash === tokenHash && !t.revokedAt && t.expiresAt > now,
    );
    return found ? { ...found } : null;
  }

  async revoke(id: string, replacedByTokenHash?: string): Promise<void> {
    const token = this.tokens.find((t) => t.id === id);
    if (token) {
      token.revokedAt = new Date();
      token.replacedByTokenHash = replacedByTokenHash ?? null;
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const token of this.tokens) {
      if (token.userId === userId && !token.revokedAt) token.revokedAt = new Date();
    }
  }
}

export class FakeAuditLogRepository implements IAuditLogRepository {
  readonly entries: AuditLogInput[] = [];
  async record(entry: AuditLogInput): Promise<void> {
    this.entries.push(entry);
  }
}

export class FakeEmailService implements IEmailService {
  readonly sent: { to: string; resetUrl: string }[] = [];
  readonly orderConfirmations: { to: string; order: OrderResponse }[] = [];
  readonly otps: { to: string; otp: string }[] = [];
  readonly buildEtaUpdates: { to: string; order: OrderResponse }[] = [];
  readonly adminNotifications: { to: string; order: OrderResponse }[] = [];
  readonly statusUpdates: { to: string; order: OrderResponse }[] = [];

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    this.sent.push({ to, resetUrl });
  }

  async sendOrderConfirmation(to: string, order: OrderResponse): Promise<void> {
    this.orderConfirmations.push({ to, order });
  }

  async sendEmailVerificationOtp(to: string, otp: string): Promise<void> {
    this.otps.push({ to, otp });
  }

  async sendBuildEtaUpdate(to: string, order: OrderResponse): Promise<void> {
    this.buildEtaUpdates.push({ to, order });
  }

  async sendAdminOrderNotification(to: string, order: OrderResponse): Promise<void> {
    this.adminNotifications.push({ to, order });
  }

  async sendOrderStatusUpdate(to: string, order: OrderResponse): Promise<void> {
    this.statusUpdates.push({ to, order });
  }
}
