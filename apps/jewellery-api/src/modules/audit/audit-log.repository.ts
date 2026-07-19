import type { AuditLogInput, IAuditLogRepository } from '../../common/interfaces/repositories';
import { AuditLogModel } from './audit-log.model';

export class AuditLogRepository implements IAuditLogRepository {
  async record(entry: AuditLogInput): Promise<void> {
    await AuditLogModel.create(entry);
  }
}
