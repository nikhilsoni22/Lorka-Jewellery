import mongoose, { Schema, type Model } from 'mongoose';
import type { CheckoutDetailsInput } from '@lorka/types';
import type { PendingCheckoutEntity } from '../../common/interfaces/entities';
import type {
  CreatePendingCheckoutData,
  IPendingCheckoutRepository,
} from '../../common/interfaces/repositories';

interface PendingCheckoutDocument {
  _id: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  userId: mongoose.Types.ObjectId | null;
  input: CheckoutDetailsInput;
  amountPaise: number;
  createdAt: Date;
}

const pendingCheckoutSchema = new Schema<PendingCheckoutDocument>(
  {
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Already validated by createRazorpayOrderSchema before it's stored.
    input: { type: Schema.Types.Mixed, required: true },
    amountPaise: { type: Number, required: true },
    // Razorpay retries webhooks for up to ~24h; a week leaves room for manual investigation.
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
  },
  { versionKey: false },
);

const PendingCheckoutModel: Model<PendingCheckoutDocument> =
  (mongoose.models.PendingCheckout as Model<PendingCheckoutDocument>) ??
  mongoose.model<PendingCheckoutDocument>('PendingCheckout', pendingCheckoutSchema);

function toEntity(doc: PendingCheckoutDocument): PendingCheckoutEntity {
  return {
    id: doc._id.toString(),
    razorpayOrderId: doc.razorpayOrderId,
    userId: doc.userId ? doc.userId.toString() : null,
    input: doc.input,
    amountPaise: doc.amountPaise,
    createdAt: doc.createdAt,
  };
}

export class PendingCheckoutRepository implements IPendingCheckoutRepository {
  async create(data: CreatePendingCheckoutData): Promise<PendingCheckoutEntity> {
    const doc = await PendingCheckoutModel.create(data);
    return toEntity(doc.toObject() as PendingCheckoutDocument);
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<PendingCheckoutEntity | null> {
    const doc = await PendingCheckoutModel.findOne({ razorpayOrderId }).lean<PendingCheckoutDocument>().exec();
    return doc ? toEntity(doc) : null;
  }
}
