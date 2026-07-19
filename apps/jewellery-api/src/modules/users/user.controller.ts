import type { Request, Response } from 'express';
import type { UserQuery } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { UserService } from './user.service';

export class UserController {
  constructor(private readonly users: UserService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as UserQuery;
    const { items, total } = await this.users.list(query);
    const totalPages = Math.ceil(total / query.limit) || 1;
    sendSuccess(res, items, 200, undefined, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  };
}
