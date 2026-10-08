'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin top progress bar for client-side navigations. The App Router has no "navigation started"
 * event, so we start the bar on clicks of internal links and finish it once the URL (pathname or
 * query) actually changes. A safety timeout clears it if a navigation never commits.
 */
function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval>>(undefined);
  const safety = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stop = () => {
    clearInterval(trickle.current);
    clearTimeout(safety.current);
  };

  const finish = () => {
    stop();
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  };

  // URL changed => the new page has rendered.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => {
      stop();
      setVisible(true);
      setProgress(10);
      // Creep towards 90% so the bar keeps moving while we wait for the server.
      trickle.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.1 : p));
      }, 200);
      safety.current = setTimeout(finish, 15_000);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor || !anchor.href || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (or just a #hash jump) => no navigation will happen.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          background: 'hsl(var(--primary))',
          boxShadow: '0 0 8px hsl(var(--primary))',
          transition: 'width 200ms ease',
        }}
      />
    </div>
  );
}

export function NavigationProgress() {
  // useSearchParams needs a Suspense boundary so it doesn't opt whole pages out of static rendering.
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}
