import { Truck, Gift, ShieldCheck, Award } from 'lucide-react';
import { Reveal } from '@/components/reveal';

const POINTS = [
  { icon: Truck, title: 'Free Shipping', copy: 'On all prepaid orders' },
  { icon: Gift, title: 'Gift Wrapping', copy: 'Beautifully packaged' },
  { icon: ShieldCheck, title: 'Secure Payments', copy: '100% secure checkout' },
  { icon: Award, title: 'Premium Quality', copy: 'Hallmarked, handcrafted' },
];

export function TrustStrip() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="container grid grid-cols-2 gap-y-10 py-12 sm:grid-cols-4">
        {POINTS.map((point, index) => (
          <Reveal key={point.title} delay={index * 80} className="flex flex-col items-center gap-3 text-center">
            <point.icon className="h-7 w-7 text-gold" strokeWidth={1.25} />
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">{point.title}</p>
            <p className="text-xs text-muted-foreground">{point.copy}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
