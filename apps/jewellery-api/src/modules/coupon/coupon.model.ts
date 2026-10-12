import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { CouponType } from '@lorka/types';

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    type: { type: String, enum: Object.values(CouponType), required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    usageLimit: { type: Number, default: null, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponDocument = InferSchemaType<typeof couponSchema> & { _id: mongoose.Types.ObjectId };

export const CouponModel: Model<CouponDocument> =
  (mongoose.models.Coupon as Model<CouponDocument>) ?? mongoose.model<CouponDocument>('Coupon', couponSchema);
