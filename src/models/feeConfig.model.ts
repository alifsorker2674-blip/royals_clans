import { Schema, model, Document } from "mongoose";

export interface ICreateFeeTier {
  slots: number;
  fee: number;
}

export interface IFeeConfig extends Document {
  tournamentCreateFeeTable: ICreateFeeTier[];
  tournamentEntryServiceFeePct: number;
  quickMatchServiceFeePct: number;
  withdrawalChargePct: number;
  /** How long a Quick Match room stays "used" before it can be handed to another pair. */
  roomCooldownMinutes: number;
  /** Entry-fee tiers players can pick from when joining the Quick Match queue. */
  quickMatchEntryFees: number[];
  updatedAt: Date;
}

const createFeeTierSchema = new Schema<ICreateFeeTier>(
  {
    slots: { type: Number, required: true, min: 2 },
    fee: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const feeConfigSchema = new Schema<IFeeConfig>(
  {
    tournamentCreateFeeTable: { type: [createFeeTierSchema], default: [] },
    tournamentEntryServiceFeePct: { type: Number, default: 0, min: 0, max: 100 },
    quickMatchServiceFeePct: { type: Number, default: 25, min: 0, max: 100 },
    withdrawalChargePct: { type: Number, default: 0, min: 0, max: 100 },
    roomCooldownMinutes: { type: Number, default: 30, min: 1 },
    quickMatchEntryFees: { type: [Number], default: [20, 50, 100] },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const FeeConfig = model<IFeeConfig>("FeeConfig", feeConfigSchema);

export const DEFAULT_CREATE_FEE_TABLE: ICreateFeeTier[] = [
  { slots: 2, fee: 5 },
  { slots: 10, fee: 20 },
  { slots: 25, fee: 50 },
  { slots: 50, fee: 100 },
  { slots: 100, fee: 200 },
  { slots: 500, fee: 800 },
];
