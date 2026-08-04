import { z } from "zod";

export const depositSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["bKash", "Nagad"]),
  referenceId: z.string().trim().min(3, "Transaction ID looks too short").max(50),
});

export const withdrawSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["bKash", "Nagad"]),
});

export const rejectTransactionSchema = z.object({
  reason: z.string().trim().min(3, "A reason is required").max(300),
});

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
