import type { PublicUser, AdminUserResponse, UserQuery } from '@lorka/types';
import type { UserEntity } from '../../common/interfaces/entities';
import type { IUserRepository, Pagination } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
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
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class UserService {
  constructor(private readonly users: IUserRepository) {}

  async getPublicById(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return toPublicUser(user);
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
