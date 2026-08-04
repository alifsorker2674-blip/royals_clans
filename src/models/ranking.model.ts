import { Schema, model, Document, Types } from "mongoose";
import { Game } from "./tournament.model";

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Heroic" | "Grandmaster";

/** Point thresholds, highest first — the first tier a player's points reach is their tier. */
export const TIER_THRESHOLDS: { tier: Tier; minPoints: number }[] = [
  { tier: "Grandmaster", minPoints: 5000 },
  { tier: "Heroic", minPoints: 3000 },
  { tier: "Diamond", minPoints: 1800 },
  { tier: "Platinum", minPoints: 1000 },
  { tier: "Gold", minPoints: 500 },
  { tier: "Silver", minPoints: 200 },
  { tier: "Bronze", minPoints: 0 },
];

export function tierForPoints(points: number): Tier {
  return TIER_THRESHOLDS.find((t) => points >= t.minPoints)!.tier;
}

export interface IRanking extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  game: Game;
  points: number;
  tier: Tier;
  wins: number;
  losses: number;
  createdAt: Date;
  updatedAt: Date;
}

const rankingSchema = new Schema<IRanking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    game: { type: String, enum: ["freefire", "bloodstrike"], required: true },
    points: { type: Number, default: 0, min: 0 },
    tier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Heroic", "Grandmaster"],
      default: "Bronze",
    },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

rankingSchema.index({ userId: 1, game: 1 }, { unique: true });
rankingSchema.index({ game: 1, points: -1 });

export const Ranking = model<IRanking>("Ranking", rankingSchema);

/** Immutable log of every points change — powers the weekly/monthly leaderboard views. */
export interface IRankingEvent extends Document {
  userId: Types.ObjectId;
  game: Game;
  points: number;
  source: "tournament" | "quickMatch";
  createdAt: Date;
}

const rankingEventSchema = new Schema<IRankingEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    game: { type: String, enum: ["freefire", "bloodstrike"], required: true },
    points: { type: Number, required: true },
    source: { type: String, enum: ["tournament", "quickMatch"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

rankingEventSchema.index({ createdAt: -1, game: 1 });

export const RankingEvent = model<IRankingEvent>("RankingEvent", rankingEventSchema);
