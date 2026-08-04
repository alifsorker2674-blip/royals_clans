import { Schema, model, Document, Types } from "mongoose";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "tournamentEntry"
  | "tournamentCreateFee"
  | "quickMatchEntry"
  | "prizePayout"
  | "refund"
  | "adminAdjustment";

export type TransactionMethod = "bKash" | "Nagad" | "internal";
export type TransactionStatus = "pending" | "approved" | "rejected";

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  method: TransactionMethod;
  referenceId?: string;
  status: TransactionStatus;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  relatedTournament?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "tournamentEntry",
        "tournamentCreateFee",
        "quickMatchEntry",
        "prizePayout",
        "refund",
        "adminAdjustment",
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ["bKash", "Nagad", "internal"], default: "internal" },
    referenceId: { type: String, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, trim: true },
    relatedTournament: { type: Schema.Types.ObjectId, ref: "Tournament" },
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction>("Transaction", transactionSchema);
