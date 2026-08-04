import { Schema, model, Document, Types } from "mongoose";

export type DisputeStatus = "open" | "resolved";

/**
 * A dispute belongs to EITHER a tournament `Match` or a `QuickMatch` — exactly one of
 * `matchId`/`quickMatchId` is set, so both kinds share one admin resolution queue.
 */
export interface IDispute extends Document {
  _id: Types.ObjectId;
  matchId?: Types.ObjectId;
  quickMatchId?: Types.ObjectId;
  raisedBy?: Types.ObjectId;
  reason: string;
  status: DisputeStatus;
  resolvedBy?: Types.ObjectId;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", index: true },
    quickMatchId: { type: Schema.Types.ObjectId, ref: "QuickMatch", index: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolution: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Dispute = model<IDispute>("Dispute", disputeSchema);
