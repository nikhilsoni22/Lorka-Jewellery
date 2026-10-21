import type { Request, Response } from 'express';
import { paginationQuerySchema, type ReviewQuery, type UpdateReviewInput } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import { AppError } from '../../common/errors/app-error';
import { uploadImageToCloudinary } from '../upload/cloudinary.client';
import type { ReviewService } from './review.service';

function productIdParam(req: Request): string {
  const id = req.params.productId as string;
  if (!/^[a-f\d]{24}$/i.test(id)) throw AppError.notFound('Product not found');
  return id;
}

export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  forProduct = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = paginationQuerySchema.parse(req.query);
    sendSuccess(res, await this.reviews.listForProduct(productIdParam(req), { page, limit }));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const review = await this.reviews.create(productIdParam(req), req.user!.id, req.body);
    sendSuccess(res, review, 201);
  };

  uploadImages = async (req: Request, res: Response): Promise<void> => {
    await this.reviews.assertCanReview(req.user!.id);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw AppError.badRequest('At least one image file is required');
    const urls = await Promise.all(files.map((file) => uploadImageToCloudinary(file.buffer, 'lorka-jewellers/reviews')));
    sendSuccess(res, { urls }, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ReviewQuery;
    const { items, total } = await this.reviews.list(query);
    sendSuccess(res, items, 200, undefined, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { isVisible } = req.body as UpdateReviewInput;
    sendSuccess(res, await this.reviews.setVisible(req.params.id as string, isVisible));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.reviews.delete(req.params.id as string);
    sendSuccess(res, null);
  };
}
