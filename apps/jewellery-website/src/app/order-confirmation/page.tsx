import { OrderConfirmationView, OrderNotFound } from '@/components/order-confirmation-view';

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; phone?: string }>;
}) {
  const { orderNumber, phone } = await searchParams;
  if (!orderNumber || !phone) return <OrderNotFound />;

  // Fetched in the browser (see useOrderLookup) so the API's per-IP lookup limit applies to each
  // customer, not to the website server shared by all of them.
  return <OrderConfirmationView orderNumber={orderNumber} phone={phone} />;
}
