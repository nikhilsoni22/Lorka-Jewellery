import type { TicketStatus } from '@lorka/types';
import type { TicketEntity } from '../../common/interfaces/entities';
import type {
  ITicketRepository,
  TicketFilter,
  CreateTicketData,
  PagedResult,
  Pagination,
} from '../../common/interfaces/repositories';
import { TicketModel, type TicketDocument } from './ticket.model';

function toEntity(doc: TicketDocument): TicketEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    subject: doc.subject,
    message: doc.message,
    status: doc.status as TicketStatus,
    customerName: doc.customerName,
    customerEmail: doc.customerEmail,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class TicketRepository implements ITicketRepository {
  async list(filter: TicketFilter, pagination: Pagination): Promise<PagedResult<TicketEntity>> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.userId) query.userId = filter.userId;
    if (filter.search) {
      const regex = { $regex: filter.search, $options: 'i' };
      query.$or = [{ subject: regex }, { customerName: regex }, { customerEmail: regex }];
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [docs, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .lean<TicketDocument[]>()
        .exec(),
      TicketModel.countDocuments(query).exec(),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<TicketEntity | null> {
    const doc = await TicketModel.findById(id).lean<TicketDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateTicketData): Promise<TicketEntity> {
    const doc = await TicketModel.create(data);
    return toEntity(doc.toObject() as TicketDocument);
  }

  async updateStatus(id: string, status: TicketStatus): Promise<TicketEntity | null> {
    const doc = await TicketModel.findByIdAndUpdate(id, { status }, { new: true })
      .lean<TicketDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }
}
