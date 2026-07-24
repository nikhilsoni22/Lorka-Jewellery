import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { ChargeType } from '@lorka/types';

const chargeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(ChargeType), required: true },
    value: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const maintenanceSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    message: { type: String, default: '' },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    silverRatePerKg: { type: Number, default: 0, min: 0 },
    goldRatePer10g: { type: Number, default: 0, min: 0 },
    charges: { type: [chargeSchema], default: [] },
    maintenance: { type: maintenanceSchema, default: () => ({}) },
    notificationEmail: { type: String, default: '' },
    razorpayKeyId: { type: String, default: '' },
    razorpayKeySecret: { type: String, default: '' },
  },
  { timestamps: true },
);

export type SettingsDocument = InferSchemaType<typeof settingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

/** Singleton collection — one document holds every site-wide setting. */
export const SettingsModel: Model<SettingsDocument> =
  (mongoose.models.Settings as Model<SettingsDocument>) ??
  mongoose.model<SettingsDocument>('Settings', settingsSchema);
