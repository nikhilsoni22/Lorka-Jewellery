'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { isVideoUrl, type BannerResponse } from '@lorka/types';

/** Fallback close timer for GIFs/images, and a hard cap for videos that never fire `ended`. */
const GIF_DURATION_MS = 9000;
const VIDEO_MAX_MS = 20000;

/**
 * Full-screen festival greeting (e.g. Diwali). Covers the whole viewport — header included — with a
 * blurred, dimmed backdrop of the page while the admin-uploaded GIF/video plays on top. Shown once
 * per visitor per session (and again if the admin swaps the media), always dismissable.
 */
export function FestivalOverlay({ banner }: { banner: BannerResponse }) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const storageKey = `festival-seen:${banner.id}:${banner.updatedAt}`;
  const isVideo = isVideoUrl(banner.image);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch {
      // Storage blocked — fall through and show it.
    }
    setVisible(true);
  }, [storageKey]);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // Ignore — it will just show again next page load.
    }
    clearTimeout(closeTimer.current);
    setTimeout(() => setVisible(false), 400);
  }, [closing, storageKey]);

  // Lock scroll, close on Esc, and auto-close after a while.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    closeTimer.current = setTimeout(close, isVideo ? VIDEO_MAX_MS : GIF_DURATION_MS);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      clearTimeout(closeTimer.current);
    };
  }, [visible, isVideo, close]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={banner.title}
      className={`fixed inset-0 z-[200] transition-opacity duration-500 ${closing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}
    >
      {/* Blurs and dims everything behind it: header, tabs and the page. */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-xl" onClick={close} />

      {/* The festival media itself, filling the viewport. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {isVideo ? (
          <video
            src={banner.image}
            autoPlay
            muted
            playsInline
            onEnded={close}
            className="h-full w-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.image} alt={banner.title} className="h-full w-full object-contain" />
        )}
      </div>

      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/70 sm:right-8 sm:top-8"
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>

      {(banner.subtitle || banner.href) && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/60 to-transparent px-4 pb-8 pt-16 text-center text-white">
          {banner.subtitle && (
            <p className="max-w-xl font-serif text-lg drop-shadow sm:text-2xl">{banner.subtitle}</p>
          )}
          {banner.href && (
            <Link
              href={banner.href}
              onClick={close}
              className="inline-flex items-center gap-2 border border-gold bg-gold px-6 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-gold-foreground transition-colors hover:bg-transparent hover:text-white"
            >
              Shop the festive collection
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
