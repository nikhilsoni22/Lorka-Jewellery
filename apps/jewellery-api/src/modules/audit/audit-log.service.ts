import type { IAuditLogRepository, AuditLogInput } from '../../common/interfaces/repositories';
import { logger } from '../../common/logger/logger';

export type AuditAction =
  | 'auth.login'
  | 'auth.login.failed'
  | 'auth.admin.login'
  | 'auth.admin.login.failed'
  | 'auth.register'
  | 'auth.logout'
  | 'auth.refresh'
  | 'auth.password.reset'
  | 'auth.email.verified';

export interface AuditContext {
  actorId?: string | null;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

export class AuditLogService {
  constructor(private readonly repo: IAuditLogRepository) {}

  /** Records an audit event. Never throws — logging must not break the request flow. */
  async record(action: AuditAction, ctx: AuditContext = {}): Promise<void> {
    const entry: AuditLogInput = { action, ...ctx };
    try {
      await this.repo.record(entry);
    } catch (err) {
      logger.warn({ err, action }, 'Failed to write audit log');
    }
  }
}
