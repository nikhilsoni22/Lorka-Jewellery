import type { Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error';
import { sendSuccess } from '../../common/response/api-response';
import { uploadImageToCloudinary } from './cloudinary.client';

export class UploadController {
  uploadProductImages = async (req: Request, res: Response): Promise<void> => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw AppError.badRequest('At least one image file is required');
    }

    const urls = await Promise.all(
      files.map((file) => uploadImageToCloudinary(file.buffer, 'lorka-jewellers/products')),
    );
    sendSuccess(res, { urls }, 201);
  };

  uploadBannerImage = async (req: Request, res: Response): Promise<void> => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      throw AppError.badRequest('An image file is required');
    }

    const url = await uploadImageToCloudinary(file.buffer, 'lorka-jewellers/banners');
    sendSuccess(res, { url }, 201);
  };
}
