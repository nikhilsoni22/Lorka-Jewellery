import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** "₹12,450" — Indian digit grouping, paise only when there are any. */
export function formatPrice(amount: number) {
  return `₹${INR.format(amount)}`;
}
