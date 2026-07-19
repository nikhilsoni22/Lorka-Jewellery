import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { BANNER_PLACEMENTS } from '@lorka/types';

const bannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    image: { type: String, required: true },
    href: { type: String, default: '' },
    placement: { type: String, enum: BANNER_PLACEMENTS, required: true, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export type BannerDocument = InferSchemaType<typeof bannerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BannerModel: Model<BannerDocument> =
  (mongoose.models.Banner as Model<BannerDocument>) ??
  mongoose.model<BannerDocument>('Banner', bannerSchema);
