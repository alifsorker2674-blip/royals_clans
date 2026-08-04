import { z } from "zod";

const feeTierSchema = z.object({
  slots: z.number().int().min(2),
  fee: z.number().min(0),
});

export const updateFeeConfigSchema = z.object({
  tournamentCreateFeeTable: z.array(feeTierSchema).min(1).optional(),
  tournamentEntryServiceFeePct: z.number().min(0).max(100).optional(),
  quickMatchServiceFeePct: z.number().min(0).max(100).optional(),
  withdrawalChargePct: z.number().min(0).max(100).optional(),
  roomCooldownMinutes: z.number().int().min(1).max(1440).optional(),
  quickMatchEntryFees: z.array(z.number().positive()).min(1).optional(),
});

export type UpdateFeeConfigInput = z.infer<typeof updateFeeConfigSchema>;
