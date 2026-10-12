import type {
  CreateReviewInput,
  ProductReviewsResponse,
  ReviewQuery,
  ReviewResponse,
  ReviewSummaryResponse,
} from '@lorka/types';
import type { ReviewEntity } from '../../common/interfaces/entities';
import type {
  IOrderRepository,
  IProductRepository,
  IReviewRepository,
  IUserRepository,
  Pagination,
} from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';

function toReviewResponse(review: ReviewEntity, productName = ''): ReviewResponse {
  return {
    id: review.id,
    productId: review.productId,
    productName,
    // Only the first name + initial is shown publicly.
    userName: shortName(review.userName),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    images: review.images,
    verifiedBuyer: review.verifiedBuyer,
    isVisible: review.isVisible,
    createdAt: review.createdAt.toISOString(),
  };
}

function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? 'Customer');
}

export class ReviewService {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly products: IProductRepository,
    private readonly orders: IOrderRepository,
    private readonly users: IUserRepository,
  ) {}

  async listForProduct(productId: string, pagination: Pagination): Promise<ProductReviewsResponse> {
    const [summary, result] = await Promise.all([
      this.summary(productId),
      this.reviews.list({ productId, isVisible: true }, pagination),
    ]);
    return { summary, reviews: result.items.map((r) => toReviewResponse(r)) };
  }

  async create(productId: string, userId: string, input: CreateReviewInput): Promise<ReviewResponse> {
    const product = await this.products.findById(productId);
    if (!product || !product.isActive) throw AppError.notFound('Product not found');
    const user = await this.users.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    if (await this.reviews.findByUserAndProduct(userId, productId)) {
      throw AppError.conflict('You have already reviewed this product');
    }

    const review = await this.reviews.create({
      productId,
      userId,
      userName: user.name,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
      images: input.images,
      verifiedBuyer: await this.orders.hasDeliveredProduct(userId, productId),
      isVisible: true,
    });
    await this.refreshProductRating(productId);
    return toReviewResponse(review, product.name);
  }

  async list(query: ReviewQuery): Promise<{ items: ReviewResponse[]; total: number }> {
    const result = await this.reviews.list(
      { isVisible: query.isVisible, search: query.search },
      { page: query.page, limit: query.limit },
    );
    const productIds = [...new Set(result.items.map((r) => r.productId))];
    const products = await Promise.all(productIds.map((id) => this.products.findById(id)));
    const nameById = new Map(products.filter(Boolean).map((p) => [p!.id, p!.name]));
    return {
      items: result.items.map((r) => ({
        ...toReviewResponse(r, nameById.get(r.productId) ?? '(deleted product)'),
        // Admins see the full name.
        userName: r.userName,
      })),
      total: result.total,
    };
  }

  async setVisible(id: string, isVisible: boolean): Promise<ReviewResponse> {
    const updated = await this.reviews.setVisible(id, isVisible);
    if (!updated) throw AppError.notFound('Review not found');
    await this.refreshProductRating(updated.productId);
    return { ...toReviewResponse(updated), userName: updated.userName };
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.reviews.delete(id);
    if (!deleted) throw AppError.notFound('Review not found');
    await this.refreshProductRating(deleted.productId);
  }

  private async summary(productId: string): Promise<ReviewSummaryResponse> {
    const distribution = await this.reviews.ratingDistribution(productId);
    const count = distribution.reduce((a, b) => a + b, 0);
    const sum = distribution.reduce((acc, n, i) => acc + n * (i + 1), 0);
    return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
  }

  /** Keeps the denormalised rating on the product (used by cards and sorting) in sync. */
  private async refreshProductRating(productId: string): Promise<void> {
    const { average, count } = await this.summary(productId);
    await this.products.setRating(productId, average, count);
  }
}
