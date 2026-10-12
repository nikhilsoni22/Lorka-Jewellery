'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { optimizedImage, optimizedSrcSet } from '@/lib/image';

const MAIN_WIDTHS = [480, 720, 960, 1200];

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  const go = useCallback((index: number) => setActive((index + count) % count), [count]);

  // Mobile: keep the swipe strip in sync when a thumbnail/arrow changes the active photo.
  useEffect(() => {
    const strip = stripRef.current;
    if (strip && strip.clientWidth) strip.scrollTo({ left: active * strip.clientWidth, behavior: 'smooth' });
  }, [active]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') go(active + 1);
      if (e.key === 'ArrowLeft') go(active - 1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, active, go]);

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
        No image
      </div>
    );
  }

  return (
    <div className="md:sticky md:top-28">
      {/* Desktop: hover to zoom into the spot under the cursor. */}
      <div
        className="group relative hidden aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted md:block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setLightbox(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active}
          src={optimizedImage(images[active], 1200)}
          srcSet={optimizedSrcSet(images[active], MAIN_WIDTHS)}
          sizes="50vw"
          alt={name}
          className="h-full w-full object-cover transition-transform duration-200 ease-out animate-fade-in"
          style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <Expand className="h-3.5 w-3.5" /> Click to enlarge
        </span>
        {count > 1 && (
          <>
            <ArrowButton side="left" onClick={(e) => (e.stopPropagation(), go(active - 1))} />
            <ArrowButton side="right" onClick={(e) => (e.stopPropagation(), go(active + 1))} />
          </>
        )}
      </div>

      {/* Mobile: swipe between photos. */}
      <div className="relative md:hidden">
        <div
          ref={stripRef}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-xl border border-border bg-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const index = Math.round(el.scrollLeft / el.clientWidth);
            if (index !== active) setActive(index);
          }}
        >
          {images.map((src, i) => (
            <button key={src + i} type="button" className="h-full w-full shrink-0 snap-center" onClick={() => setLightbox(true)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optimizedImage(src, 900)}
                srcSet={optimizedSrcSet(src, [480, 720, 900])}
                sizes="100vw"
                alt={`${name} — photo ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        {count > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 rounded-full bg-background/80 shadow transition-all', i === active ? 'w-5 bg-background' : 'w-1.5')}
              />
            ))}
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              className={cn(
                'aspect-square overflow-hidden rounded-lg border-2 bg-muted transition-all',
                i === active ? 'border-gold' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optimizedImage(src, 200)} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photos`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 animate-fade-in"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active}
            src={optimizedImage(images[active], 1800)}
            alt={name}
            className="max-h-[88vh] max-w-[92vw] object-contain animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
          {count > 1 && (
            <>
              <ArrowButton side="left" dark onClick={(e) => (e.stopPropagation(), go(active - 1))} />
              <ArrowButton side="right" dark onClick={(e) => (e.stopPropagation(), go(active + 1))} />
              <p className="absolute bottom-5 text-sm text-white/70">
                {active + 1} / {count}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ArrowButton({
  side,
  dark,
  onClick,
}: {
  side: 'left' | 'right';
  dark?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 rounded-full p-2 shadow transition-all',
        side === 'left' ? 'left-3' : 'right-3',
        dark
          ? 'bg-white/10 text-white hover:bg-white/20'
          : 'bg-background/90 text-foreground opacity-0 hover:scale-110 group-hover:opacity-100',
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
