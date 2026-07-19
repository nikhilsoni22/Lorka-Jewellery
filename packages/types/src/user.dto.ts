import type { z } from 'zod';
import type { userQuerySchema } from './user.schemas';
import type { UserRole } from './enums';

export type UserQuery = z.infer<typeof userQuerySchema>;

/** Admin-facing view of a registered user — never includes password/token hashes. */
export interface AdminUserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
