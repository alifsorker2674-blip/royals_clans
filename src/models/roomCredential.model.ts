import { Schema, model, Document, Types } from "mongoose";
import { Game } from "./tournament.model";

export interface IRoomCredential extends Document {
  _id: Types.ObjectId;
  game: Game;
  roomId: string;
  roomPassword: string;
  isActive: boolean;
  /**
   * When this room was last handed to a Quick Match pair. A room is only reusable once
   * `roomCooldownMinutes` (feeConfig) have passed, so two live matches never share a lobby.
   */
  lastAssignedAt?: Date;
  timesAssigned: number;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomCredentialSchema = new Schema<IRoomCredential>(
  {
    game: { type: String, enum: ["freefire", "bloodstrike"], required: true, index: true },
    roomId: { type: String, required: true, trim: true },
    roomPassword: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    lastAssignedAt: { type: Date },
    timesAssigned: { type: Number, default: 0 },
    note: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// The assignment query filters on game + isActive and orders by lastAssignedAt.
roomCredentialSchema.index({ game: 1, isActive: 1, lastAssignedAt: 1 });

export const RoomCredential = model<IRoomCredential>("RoomCredential", roomCredentialSchema);
