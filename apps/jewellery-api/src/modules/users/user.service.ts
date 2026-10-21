import { UserRole, type PublicUser, type AdminUserResponse, type SetUserBlockedInput, type UserQuery } from '@lorka/types';
import type { UserEntity } from '../../common/interfaces/entities';
import type { IUserRepository, Pagination } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';
import type { AuditLogService } from '../audit/audit-log.service';

export const BLOCKED_ACCOUNT_MESSAGE =
  "Your account has been blocked, so you can't place orders or write reviews. Please raise a support ticket if you'd like to talk to us.";

/** Throws for a blocked customer. Guests (no userId) pass — they're limited elsewhere. */
export async function assertNotBlocked(users: IUserRepository, userId: string | undefined): Promise<void> {
  if (!userId) return;
  const user = await users.findById(userId);
  if (user?.isBlocked) throw AppError.forbidden(BLOCKED_ACCOUNT_MESSAGE);
}

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    isBlocked: user.isBlocked,
    blockedReason: user.isBlocked ? user.blockedReason : undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toAdminUserResponse(user: UserEntity): AdminUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    blockedReason: user.blockedReason,
    blockedAt: user.blockedAt ? user.blockedAt.toISOString() : undefined,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class UserService {
  constructor(
    private readonly users: IUserRepository,
    private readonly audit: AuditLogService,
  ) {}

  async getPublicById(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return toPublicUser(user);
  }

  /** Admin blocks (or unblocks) a customer. Staff accounts can't be blocked from here. */
  async setBlocked(actorId: string, userId: string, input: SetUserBlockedInput): Promise<AdminUserResponse> {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    if (user.role !== UserRole.Customer) throw AppError.badRequest('Only customer accounts can be blocked');

    const updated = await this.users.setBlocked(userId, input.blocked, input.reason ?? '');
    if (!updated) throw AppError.notFound('User not found');
    await this.audit.record(input.blocked ? 'user.blocked' : 'user.unblocked', {
      actorId,
      meta: { userId, email: user.email, reason: input.reason || undefined },
    });
    return toAdminUserResponse(updated);
  }

  async list(query: UserQuery): Promise<{ items: AdminUserResponse[]; total: number }> {
    const pagination: Pagination = { page: query.page, limit: query.limit };
    const result = await this.users.list(
      { role: query.role, isBlocked: query.isBlocked, search: query.search },
      pagination,
    );
    return { items: result.items.map(toAdminUserResponse), total: result.total };
  }
}
