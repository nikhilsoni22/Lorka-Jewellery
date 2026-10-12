import { checkoutDetailsSchema } from './order.schemas';

/** The full checkout form, not just the items: the API keeps it against the Razorpay order so the
 * payment webhook can create the order even if the customer closes the tab right after paying. */
export const createRazorpayOrderSchema = checkoutDetailsSchema;
