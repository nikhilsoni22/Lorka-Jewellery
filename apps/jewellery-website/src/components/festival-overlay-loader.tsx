import type { BannerResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { FestivalOverlay } from '@/components/festival-overlay';

/** Server component: fetches the live festival banner (the API already applies active + date window)
 * and hands it to the client overlay. Renders nothing if there isn't one or the API is down. */
export async function FestivalOverlayLoader() {
  const banners = await apiGet<BannerResponse[]>('/banners?placement=festival').catch(
    () => [] as BannerResponse[],
  );
  const banner = banners[0];
  if (!banner) return null;
  return <FestivalOverlay banner={banner} />;
}
