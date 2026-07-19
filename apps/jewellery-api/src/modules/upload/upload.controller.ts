import type { Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error';
import { sendSuccess } from '../../common/response/api-response';

export class UploadController {
  uploadProductImages = async (req: Request, res: Response): Promise<void> => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw AppError.badRequest('At least one image file is required');
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const urls = files.map((file) => `${origin}/uploads/products/${file.filename}`);
    sendSuccess(res, { urls }, 201);
  };

  uploadBannerImage = async (req: Request, res: Response): Promise<void> => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      throw AppError.badRequest('An image file is required');
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const url = `${origin}/uploads/banners/${file.filename}`;
    sendSuccess(res, { url }, 201);
  };
}
