import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { TicketStatus } from '@lorka/types';

const ticketSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.Open,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type TicketDocument = InferSchemaType<typeof ticketSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TicketModel: Model<TicketDocument> =
  (mongoose.models.Ticket as Model<TicketDocument>) ??
  mongoose.model<TicketDocument>('Ticket', ticketSchema);
