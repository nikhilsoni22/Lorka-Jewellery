import { env } from '../src/config/env';
import { logger } from '../src/common/logger/logger';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import type { Types } from 'mongoose';
import { ProductModel } from '../src/modules/product/product.model';

/**
 * One-time migration: making charge used to be a flat rupee amount per product (`makingCharge`);
 * it is now charged per gram (`makingChargePerGram`). Converts each product as flat ÷ weight so
 * its price stays the same (e.g. ₹360 on a 6g piece → ₹60/g).
 *
 * Dry run by default — prints what would change. Pass `--apply` to write.
 * Only touches products that don't have `makingChargePerGram` yet, so it's safe to re-run. The old
 * `makingCharge` field is left in place so code still running the flat formula keeps working
 * until the new build is deployed.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

async function migrate(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await connectDatabase(env.MONGO_URI);

  const docs = await ProductModel.collection
    .find({ makingChargePerGram: { $exists: false } })
    .project<{ _id: Types.ObjectId; sku: string; name: string; weight: number; makingCharge?: number }>({
      sku: 1,
      name: 1,
      weight: 1,
      makingCharge: 1,
    })
    .toArray();

  const rows = [];
  const updates = [];
  for (const doc of docs) {
    const flat = doc.makingCharge ?? 0;
    if (!(doc.weight > 0)) {
      logger.warn({ sku: doc.sku, weight: doc.weight }, 'Skipped: product has no weight — set it in the admin panel');
      continue;
    }
    const perGram = round2(flat / doc.weight);
    rows.push({
      sku: doc.sku,
      weight: doc.weight,
      'old making ₹': flat,
      'new ₹/g': perGram,
      'new making ₹': round2(perGram * doc.weight),
    });
    updates.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { makingChargePerGram: perGram } } } });
  }

  console.table(rows);

  if (!apply) {
    logger.info({ count: updates.length }, 'Dry run — nothing written. Re-run with --apply to save.');
  } else if (updates.length > 0) {
    const result = await ProductModel.collection.bulkWrite(updates);
    logger.info({ modified: result.modifiedCount }, 'Making charge converted to per gram');
  } else {
    logger.info('Nothing to migrate');
  }

  await disconnectDatabase();
  process.exit(0);
}

migrate().catch((err) => {
  logger.error({ err }, 'Making charge migration failed');
  process.exit(1);
});
