'use client';

import { useEffect } from 'react';
import { isVideoUrl } from '@lorka/types';

/**
 * Festival GIF/video (set in Admin → Banners → "Festival background") playing behind the header and
 * the homepage hero. It's sharp at the top and gets progressively blurred towards the bottom, where it
 * fades into the normal page background — so the rest of the page below stays the usual plain page.
 *
 * The hero text switches to light colours (see .festival-hero in globals.css) instead of the video
 * being washed out, so the GIF stays vivid.
 *
 * Must be rendered inside a `relative isolate` wrapper around the hero. It reaches up behind the
 * sticky header (h-20), and while the page is scrolled to the top it marks <html> so the header turns
 * transparent and the video shows through it.
 */
export function FestivalBackdrop({ src }: { src: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      if (window.scrollY < 40) root.dataset.festivalTop = '';
      else delete root.dataset.festivalTop;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      delete root.dataset.festivalTop;
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 -z-10 overflow-hidden">
      {isVideoUrl(src) ? (
        <video src={src} autoPlay muted loop playsInline className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}

      {/* Progressive blur: none at the top, increasing towards the bottom. */}
      <div className="festival-blur absolute inset-0 backdrop-blur-sm" />
      <div className="festival-blur-strong absolute inset-0 backdrop-blur-xl" />

      {/* Long, eased fade into the page colour (many stops, so there is no visible "edge"). */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/5"
        style={{
          background:
            'linear-gradient(to bottom, hsl(var(--background) / 0) 0%, hsl(var(--background) / 0.02) 12%, hsl(var(--background) / 0.07) 24%, hsl(var(--background) / 0.16) 36%, hsl(var(--background) / 0.3) 48%, hsl(var(--background) / 0.48) 60%, hsl(var(--background) / 0.68) 72%, hsl(var(--background) / 0.86) 84%, hsl(var(--background) / 0.96) 93%, hsl(var(--background)) 100%)',
        }}
      />
    </div>
  );
}
