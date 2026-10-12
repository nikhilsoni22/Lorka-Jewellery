import type { Metadata } from 'next';
import { InvoiceView } from '@/components/invoice-view';
import { OrderNotFound } from '@/components/order-confirmation-view';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false } };

export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; phone?: string }>;
}) {
  const { orderNumber, phone } = await searchParams;
  if (!orderNumber || !phone) return <OrderNotFound />;
  return <InvoiceView orderNumber={orderNumber} phone={phone} />;
}
