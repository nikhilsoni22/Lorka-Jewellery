import type { z } from 'zod';
import type { createBannerSchema, updateBannerSchema, bannerQuerySchema } from './banner.schemas';

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type BannerQuery = z.infer<typeof bannerQuerySchema>;

export interface BannerResponse {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}
