import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '' },
    comment: { type: String, required: true },
    images: { type: [String], default: [] },
    verifiedBuyer: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// One review per customer per product.
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export type ReviewDocument = InferSchemaType<typeof reviewSchema> & { _id: mongoose.Types.ObjectId };

export const ReviewModel: Model<ReviewDocument> =
  (mongoose.models.Review as Model<ReviewDocument>) ?? mongoose.model<ReviewDocument>('Review', reviewSchema);
