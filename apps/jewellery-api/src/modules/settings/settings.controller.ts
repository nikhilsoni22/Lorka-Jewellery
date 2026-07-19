import type { Request, Response } from 'express';
import type { UpdateSettingsInput } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { SettingsService } from './settings.service';

export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.settings.get();
    sendSuccess(res, settings);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const settings = await this.settings.update(req.body as UpdateSettingsInput);
    sendSuccess(res, settings);
  };
}
