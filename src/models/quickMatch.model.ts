import { Schema, model, Document, Types } from "mongoose";
import { Game } from "./tournament.model";

export type QuickMatchQueueStatus = "waiting" | "matched" | "cancelled";
export type QuickMatchStatus =
  | "active"
  | "awaiting_results"
  | "confirmed"
  | "under_review"
  | "resolved"
  | "cancelled";

export interface IQuickMatchQueue extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  game: Game;
  entryFee: number;
  status: QuickMatchQueueStatus;
  matchId?: Types.ObjectId;
  createdAt: Date;
}

const quickMatchQueueSchema = new Schema<IQuickMatchQueue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    game: { type: String, enum: ["freefire", "bloodstrike"], required: true },
    entryFee: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["waiting", "matched", "cancelled"], default: "waiting" },
    matchId: { type: Schema.Types.ObjectId, ref: "QuickMatch" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Pairing looks up the oldest waiting entry for the same game + entry fee.
quickMatchQueueSchema.index({ game: 1, entryFee: 1, status: 1, createdAt: 1 });

export const QuickMatchQueue = model<IQuickMatchQueue>("QuickMatchQueue", quickMatchQueueSchema);

export interface IQuickMatchSubmission {
  userId: Types.ObjectId;
  screenshotUrl: string;
  selectedWinner: Types.ObjectId;
  submittedAt: Date;
}

export interface IQuickMatch extends Document {
  _id: Types.ObjectId;
  game: Game;
  players: Types.ObjectId[];
  entryFee: number;
  prizeAmount: number;
  platformFee: number;
  roomId: string;
  roomPassword: string;
  roomCredentialId?: Types.ObjectId;
  status: QuickMatchStatus;
  submissions: IQuickMatchSubmission[];
  winnerId?: Types.ObjectId;
  verifiedBy?: Types.ObjectId;
  paidOut: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<IQuickMatchSubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    screenshotUrl: { type: String, required: true, trim: true },
    selectedWinner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const quickMatchSchema = new Schema<IQuickMatch>(
  {
    game: { type: String, enum: ["freefire", "bloodstrike"], required: true },
    players: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    entryFee: { type: Number, required: true, min: 0 },
    prizeAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    roomId: { type: String, required: true, trim: true },
    roomPassword: { type: String, required: true, trim: true },
    roomCredentialId: { type: Schema.Types.ObjectId, ref: "RoomCredential" },
    status: {
      type: String,
      enum: ["active", "awaiting_results", "confirmed", "under_review", "resolved", "cancelled"],
      default: "active",
      index: true,
    },
    submissions: { type: [submissionSchema], default: [] },
    winnerId: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidOut: { type: Boolean, default: false },
  },
  { timestamps: true }
);

quickMatchSchema.index({ players: 1, status: 1 });

export const QuickMatch = model<IQuickMatch>("QuickMatch", quickMatchSchema);
