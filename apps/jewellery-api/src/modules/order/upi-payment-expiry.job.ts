import { logger } from '../../common/logger/logger';
import type { OrderService } from './order.service';

const CHECK_EVERY_MS = 10 * 60_000;

/**
 * Periodically cancels UPI orders nobody paid for in time (see OrderService.cancelOverdueUpiOrders).
 * Also runs once at startup, so orders that went overdue while the server was asleep (e.g. a free
 * Render instance) are cleaned up as soon as it wakes. Returns a function that stops the job.
 */
export function startUpiPaymentExpiryJob(orders: OrderService): () => void {
  const run = () =>
    orders.cancelOverdueUpiOrders().catch((err) => logger.error({ err }, '[order] UPI payment expiry check failed'));
  void run();
  const timer = setInterval(run, CHECK_EVERY_MS);
  timer.unref();
  return () => clearInterval(timer);
}
