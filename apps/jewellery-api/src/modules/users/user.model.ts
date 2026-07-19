import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { USER_ROLES, UserRole } from '@lorka/types';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: UserRole.Customer, index: true },
    isBlocked: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    resetTokenHash: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    otpHash: { type: String, default: null },
    otpExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const UserModel: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) ??
  mongoose.model<UserDocument>('User', userSchema);
