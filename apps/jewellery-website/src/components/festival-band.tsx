import Link from 'next/link';
import { isVideoUrl } from '@lorka/types';
import { optimizedImage, videoPoster } from '@/lib/image';

/**
 * The festival GIF/video (Admin → Banners → "Festival banner") as a full-width cinematic band.
 * It's shown at its own shape — never stretched behind other text — because these banners usually
 * carry their own lettering. On phones it's centre-cropped to 16:9 so it isn't a thin sliver.
 */
export function FestivalBand({ src, href, title }: { src: string; href?: string; title?: string }) {
  const media = isVideoUrl(src) ? (
    <video
      src={src}
      poster={videoPoster(src, 1600) || undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={title || undefined}
      className="block aspect-[16/9] w-full object-cover sm:aspect-auto sm:h-auto"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizedImage(src, 1920)}
      alt={title || ''}
      loading="lazy"
      className="block aspect-[16/9] w-full object-cover sm:aspect-auto sm:h-auto"
    />
  );

  return (
    <section className="bg-espresso">
      {href ? (
        <Link href={href} className="block">
          {media}
        </Link>
      ) : (
        media
      )}
    </section>
  );
}
