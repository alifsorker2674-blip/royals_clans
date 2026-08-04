import { Schema, model, Document, Types } from "mongoose";

export type Game = "freefire" | "bloodstrike";
export type TournamentMode = "solo" | "duo" | "squad";
export type TournamentStatus = "pending" | "approved" | "rejected" | "live" | "completed" | "cancelled";

export interface ITournament extends Document {
  _id: Types.ObjectId;
  title: string;
  game: Game;
  mode: TournamentMode;
  entryFee: number;
  slots: number;
  prizePool: number;
  prizeDistribution?: string;
  rules?: string;
  schedule?: Date;
  createFeeCharged: number;
  status: TournamentStatus;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  rejectionReason?: string;
  /**
   * In-game lobby credentials. NEVER exposed publicly — only registered participants,
   * the organizer, and admins can read these (see tournament.service.ts).
   */
  roomId: string;
  roomPassword: string;
  /** True for tournaments the platform itself hosts (created from the admin panel). */
  isOfficial: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    game: { type: String, enum: ["freefire", "bloodstrike"], required: true },
    mode: { type: String, enum: ["solo", "duo", "squad"], required: true },
    entryFee: { type: Number, required: true, min: 0 },
    slots: { type: Number, required: true, min: 2 },
    prizePool: { type: Number, required: true, min: 0 },
    prizeDistribution: { type: String, trim: true },
    rules: { type: String, trim: true },
    schedule: { type: Date },
    createFeeCharged: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "live", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, trim: true },
    roomId: { type: String, required: true, trim: true },
    roomPassword: { type: String, required: true, trim: true },
    isOfficial: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tournamentSchema.index({ game: 1, status: 1 });

export const Tournament = model<ITournament>("Tournament", tournamentSchema);
