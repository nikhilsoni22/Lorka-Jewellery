import { Truck, Gift, ShieldCheck, Award } from 'lucide-react';

const POINTS = [
  { icon: Award, title: 'Hallmarked & Handcrafted', copy: 'Certified metal, artisan made' },
  { icon: Truck, title: 'Free Shipping', copy: 'On all prepaid orders' },
  { icon: Gift, title: 'Gift Wrapping', copy: 'Beautifully packaged' },
  { icon: ShieldCheck, title: 'Secure Checkout', copy: 'Safe, verified payments' },
];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-background">
      <div className="container grid grid-cols-2 lg:grid-cols-4">
        {POINTS.map((point, index) => (
          <div
            key={point.title}
            className={[
              'flex flex-col items-center gap-3 px-2 py-7 text-center sm:flex-row sm:gap-4 sm:px-6 sm:text-left lg:justify-center',
              index % 2 === 1 ? 'border-l border-border' : '',
              index >= 2 ? 'border-t border-border lg:border-t-0' : '',
              index === 2 ? 'lg:border-l' : '',
            ].join(' ')}
          >
            <point.icon className="h-6 w-6 shrink-0 text-gold" strokeWidth={1.1} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">{point.title}</p>
              <p className="mt-1 text-xs font-light text-muted-foreground">{point.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
