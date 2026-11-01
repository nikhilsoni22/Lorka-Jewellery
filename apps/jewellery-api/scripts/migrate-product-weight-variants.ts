import type { Types } from 'mongoose';
import { env } from '../src/config/env';
import { logger } from '../src/common/logger/logger';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { ProductModel } from '../src/modules/product/product.model';

/**
 * One-time migration: a product used to have a single `weight` + `stock`; it now comes in up to 3
 * weights (`variants`), each with its own stock. Turns each product's weight + stock into its one
 * variant, so prices and stock stay exactly as they were.
 *
 * Dry run by default — prints what would change. Pass `--apply` to write.
 * Only touches products that don't have `variants` yet, so it's safe to re-run. Run it right after
 * the new build is live: until then the old code keeps changing the old `stock` field. The new code
 * reads unconverted products as one weight in the meantime, so the site keeps working.
 */
async function migrate(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await connectDatabase(env.MONGO_URI);

  const docs = await ProductModel.collection
    .find({ $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] })
    .project<{ _id: Types.ObjectId; sku: string; weight?: number; stock?: number }>({ sku: 1, weight: 1, stock: 1 })
    .toArray();

  const rows = [];
  const updates = [];
  for (const doc of docs) {
    if (!(doc.weight! > 0)) {
      logger.warn({ sku: doc.sku, weight: doc.weight }, 'Skipped: product has no weight — set it in the admin panel');
      continue;
    }
    const variant = { weight: doc.weight!, stock: doc.stock ?? 0 };
    rows.push({ sku: doc.sku, weight: variant.weight, stock: variant.stock });
    updates.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { variants: [variant] } } } });
  }

  console.table(rows);

  if (!apply) {
    logger.info({ count: updates.length }, 'Dry run — nothing written. Re-run with --apply to save.');
  } else if (updates.length > 0) {
    const result = await ProductModel.collection.bulkWrite(updates);
    logger.info({ modified: result.modifiedCount }, 'Products converted to weight variants');
  } else {
    logger.info('Nothing to migrate');
  }

  await disconnectDatabase();
  process.exit(0);
}

migrate().catch((err) => {
  logger.error({ err }, 'Weight variants migration failed');
  process.exit(1);
});
