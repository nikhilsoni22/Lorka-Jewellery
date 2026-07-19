import { z } from 'zod';
import { orderItemInputSchema } from './order.schemas';

export const createRazorpayOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'At least one item is required').max(50),
});
