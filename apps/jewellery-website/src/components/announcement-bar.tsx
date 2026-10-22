import Link from 'next/link';

const MESSAGES = ['Free shipping on all prepaid orders', 'Hallmarked & handcrafted', 'Gift-wrapped with care'];

/** Thin espresso strip above the header — store promises on the left, order tracking on the right. */
export function AnnouncementBar() {
  return (
    <div className="announcement-bar bg-espresso text-ivory/80">
      <div className="container flex h-9 items-center justify-center text-[10.5px] uppercase tracking-[0.22em] lg:justify-between">
        <p className="flex items-center gap-4">
          {MESSAGES.map((message, index) => (
            <span key={message} className={index === 0 ? 'flex items-center gap-4' : 'hidden items-center gap-4 md:flex'}>
              {index > 0 && <span aria-hidden className="h-1 w-1 rotate-45 bg-gold-light/70" />}
              {message}
            </span>
          ))}
        </p>
        <nav className="hidden items-center gap-6 lg:flex">
          <Link href="/track-order" className="link-underline transition-colors hover:text-ivory">
            Track Order
          </Link>
          <Link href="/contact" className="link-underline transition-colors hover:text-ivory">
            Help
          </Link>
        </nav>
      </div>
    </div>
  );
}
