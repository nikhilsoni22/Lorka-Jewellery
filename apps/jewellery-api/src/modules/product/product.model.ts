import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { MetalType } from '@lorka/types';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    sku: { type: String, required: true, unique: true, trim: true, index: true },
    metalType: { type: String, enum: Object.values(MetalType), required: true, index: true },
    makingCharge: { type: Number, required: true, min: 0, default: 0 },
    discountPercent: { type: Number, default: null, min: 0, max: 100 },
    images: { type: [String], default: [] },
    material: { type: String, default: '' },
    purity: { type: String, default: '' },
    weight: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export type ProductDocument = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductModel: Model<ProductDocument> =
  (mongoose.models.Product as Model<ProductDocument>) ??
  mongoose.model<ProductDocument>('Product', productSchema);
