'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { META_PIXEL_ID, trackPixel } from '@/lib/meta-pixel';

/**
 * Loads the Meta Pixel. The snippet itself reports the first PageView; this component reports the
 * rest, because Next.js navigates between pages without a full reload.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    trackPixel('PageView');
  }, [pathname]);

  if (!META_PIXEL_ID) return null;

  return (
    <>
      {/* beforeInteractive so `fbq` exists (and queues calls) before any page component fires an event. */}
      <Script
        id="meta-pixel"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
