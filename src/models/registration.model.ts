import { Schema, model, Document, Types } from "mongoose";

export type RegistrationPaymentStatus = "pending" | "approved" | "rejected";

export interface IRegistration extends Document {
  _id: Types.ObjectId;
  tournamentId: Types.ObjectId;
  userId: Types.ObjectId;
  paymentStatus: RegistrationPaymentStatus;
  entryTransactionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new Schema<IRegistration>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    paymentStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    entryTransactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
  },
  { timestamps: true }
);

registrationSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });

export const Registration = model<IRegistration>("Registration", registrationSchema);
