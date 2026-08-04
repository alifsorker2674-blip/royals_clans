import { FeeConfig, DEFAULT_CREATE_FEE_TABLE, ICreateFeeTier } from "../models/feeConfig.model";
import { AppError } from "../utils/AppError";

/** feeConfig is a singleton — this creates it with sensible defaults the first time it's read. */
export async function getFeeConfig() {
  let config = await FeeConfig.findOne();
  if (!config) {
    config = await FeeConfig.create({ tournamentCreateFeeTable: DEFAULT_CREATE_FEE_TABLE });
  }
  return config;
}

export async function updateFeeConfig(updates: {
  tournamentCreateFeeTable?: ICreateFeeTier[];
  tournamentEntryServiceFeePct?: number;
  quickMatchServiceFeePct?: number;
  withdrawalChargePct?: number;
  roomCooldownMinutes?: number;
  quickMatchEntryFees?: number[];
}) {
  const config = await getFeeConfig();
  if (updates.tournamentCreateFeeTable) {
    config.tournamentCreateFeeTable = [...updates.tournamentCreateFeeTable].sort((a, b) => a.slots - b.slots);
  }
  if (updates.tournamentEntryServiceFeePct !== undefined) {
    config.tournamentEntryServiceFeePct = updates.tournamentEntryServiceFeePct;
  }
  if (updates.quickMatchServiceFeePct !== undefined) {
    config.quickMatchServiceFeePct = updates.quickMatchServiceFeePct;
  }
  if (updates.withdrawalChargePct !== undefined) {
    config.withdrawalChargePct = updates.withdrawalChargePct;
  }
  if (updates.roomCooldownMinutes !== undefined) {
    config.roomCooldownMinutes = updates.roomCooldownMinutes;
  }
  if (updates.quickMatchEntryFees) {
    config.quickMatchEntryFees = [...updates.quickMatchEntryFees].sort((a, b) => a - b);
  }
  await config.save();
  return config;
}

/**
 * Finds the smallest configured tier whose slot count covers the requested slots.
 * If the requested slots exceed every configured tier, the largest tier's fee is used.
 */
export async function calculateTournamentCreateFee(slots: number): Promise<number> {
  const config = await getFeeConfig();
  const table = [...config.tournamentCreateFeeTable].sort((a, b) => a.slots - b.slots);
  if (table.length === 0) throw new AppError(500, "Tournament create-fee pricing has not been configured yet");

  const tier = table.find((t) => slots <= t.slots);
  return tier ? tier.fee : table[table.length - 1].fee;
}
