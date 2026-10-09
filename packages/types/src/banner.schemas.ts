import { z } from 'zod';
import { BANNER_PLACEMENTS } from './catalog.enums';
import { booleanQueryParam } from './common.schemas';

/** Whether a banner/festival media URL is a video file (vs. an image or GIF). */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

export const createBannerSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(140),
  subtitle: z.string().trim().max(300).optional().default(''),
  image: z.string().trim().url('Image must be a valid URL'),
  href: z.string().trim().max(300).optional().default(''),
  placement: z.enum(BANNER_PLACEMENTS as [string, ...string[]]),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  // null clears a previously-set date on update; coerce.date alone would turn null into 1970.
  startDate: z.union([z.null(), z.coerce.date()]).optional(),
  endDate: z.union([z.null(), z.coerce.date()]).optional(),
});

export const updateBannerSchema = createBannerSchema.partial();

export const bannerQuerySchema = z.object({
  placement: z.enum(BANNER_PLACEMENTS as [string, ...string[]]).optional(),
  isActive: booleanQueryParam,
});
