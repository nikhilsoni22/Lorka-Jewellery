import { ChevronDown } from 'lucide-react';
import type { ProductResponse } from '@lorka/types';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Transparent price: live metal value + making charge − offer. Builds trust for jewellery buyers. */
export function PriceBreakup({ product }: { product: ProductResponse }) {
  const { metalRatePerGram, metalValue, makingCharge, offerDiscount } = product.priceBreakup;
  const metal = product.metalType === 'gold' ? 'Gold' : 'Silver';
  const finalPrice = product.discountPrice ?? product.price;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>Price breakup</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <dl className="space-y-2 border-t border-border px-4 py-3 text-sm animate-fade-in">
        <Row
          label={`${metal} value`}
          hint={`${product.weight}g × ${inr(metalRatePerGram)}/g (today's rate)`}
          value={inr(metalValue)}
        />
        <Row label="Making charges" value={inr(makingCharge)} />
        {offerDiscount > 0 && (
          <Row label={`Offer (${product.discountPercent}% off)`} value={`−${inr(offerDiscount)}`} highlight />
        )}
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <dt>Total</dt>
          <dd>{inr(finalPrice)}</dd>
        </div>
      </dl>
    </details>
  );
}

function Row({ label, hint, value, highlight }: { label: string; hint?: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>
        <span className={highlight ? 'text-emerald-700' : ''}>{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </dt>
      <dd className={highlight ? 'text-emerald-700' : ''}>{value}</dd>
    </div>
  );
}
