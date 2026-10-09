export enum BannerPlacement {
  Hero = 'hero',
  Promo = 'promo',
  /** GIF/video playing behind the homepage header + hero (festival backgrounds). */
  Festival = 'festival',
}

export const BANNER_PLACEMENTS = Object.values(BannerPlacement);

export enum MetalType {
  Silver = 'silver',
  Gold = 'gold',
}

export const METAL_TYPES = Object.values(MetalType);
