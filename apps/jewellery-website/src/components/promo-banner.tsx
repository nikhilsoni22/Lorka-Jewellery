import Link from 'next/link';
import type { BannerResponse } from '@lorka/types';

/** Full-bleed image banner — whatever the admin uploads is the whole banner, no text overlay. */
export function PromoBanner({ banner }: { banner: BannerResponse | undefined }) {
  if (!banner?.image) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={banner.image}
      alt={banner.title || ''}
      className="block h-40 w-full object-cover sm:h-56 lg:h-72"
    />
  );

  return <section className="overflow-hidden">{banner.href ? <Link href={banner.href}>{image}</Link> : image}</section>;
}
