import type { Request, Response } from 'express';
import { UserRole, type UpdateSettingsInput } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { SettingsService } from './settings.service';

export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const isAdmin = req.user?.role === UserRole.Admin || req.user?.role === UserRole.SuperAdmin;
    const settings = await this.settings.get(isAdmin);
    sendSuccess(res, settings);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.settings.update(req.body as UpdateSettingsInput);
    sendSuccess(res, settings);
  };
}
