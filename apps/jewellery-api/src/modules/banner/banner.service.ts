import type { BannerResponse, CreateBannerInput, UpdateBannerInput, BannerQuery } from '@lorka/types';
import type { BannerEntity } from '../../common/interfaces/entities';
import type { IBannerRepository } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';

export function toBannerResponse(banner: BannerEntity): BannerResponse {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    image: banner.image,
    href: banner.href,
    placement: banner.placement,
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    startDate: banner.startDate?.toISOString(),
    endDate: banner.endDate?.toISOString(),
    createdAt: banner.createdAt.toISOString(),
    updatedAt: banner.updatedAt.toISOString(),
  };
}

export class BannerService {
  constructor(private readonly banners: IBannerRepository) {}

  /** Public listing: only active banners within their scheduled window. */
  async listPublic(query: BannerQuery): Promise<BannerResponse[]> {
    const banners = await this.banners.list({
      placement: query.placement,
      isActive: true,
      onlyLive: true,
    });
    return banners.map(toBannerResponse);
  }

  /** Admin listing: everything, regardless of active/schedule state. */
  async listAll(): Promise<BannerResponse[]> {
    const banners = await this.banners.list({});
    return banners.map(toBannerResponse);
  }

  async getById(id: string): Promise<BannerResponse> {
    const banner = await this.banners.findById(id);
    if (!banner) throw AppError.notFound('Banner not found');
    return toBannerResponse(banner);
  }

  async create(input: CreateBannerInput): Promise<BannerResponse> {
    this.assertImageForPlacement(input.placement, input.image);
    const banner = await this.banners.create(input);
    return toBannerResponse(banner);
  }

  async update(id: string, input: UpdateBannerInput): Promise<BannerResponse> {
    if (input.image !== undefined) {
      const existing = await this.banners.findById(id);
      if (!existing) throw AppError.notFound('Banner not found');
      this.assertImageForPlacement(input.placement ?? existing.placement, input.image);
    }
    const updated = await this.banners.update(id, input);
    if (!updated) throw AppError.notFound('Banner not found');
    return toBannerResponse(updated);
  }

  /** Hero banners are text-only; promo and festival banners need an image/GIF/video. */
  private assertImageForPlacement(placement: string, image: string | undefined): void {
    if (placement !== 'hero' && !image) {
      throw AppError.badRequest('An image is required for this banner placement', {
        image: ['An image is required for this banner placement'],
      });
    }
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.banners.delete(id);
    if (!deleted) throw AppError.notFound('Banner not found');
  }
}
