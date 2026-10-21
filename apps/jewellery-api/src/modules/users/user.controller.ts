import type { Request, Response } from 'express';
import type { UserQuery } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { UserService } from './user.service';

export class UserController {
  constructor(private readonly users: UserService) {}

  setBlocked = async (req: Request, res: Response): Promise<void> => {
    const user = await this.users.setBlocked(req.user!.id, req.params.id as string, req.body);
    sendSuccess(res, user);
  };

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
