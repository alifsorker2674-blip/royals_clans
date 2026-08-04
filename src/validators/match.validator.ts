import { z } from "zod";

export const createMatchSchema = z.object({
  round: z.string().trim().min(1).max(50).default("Final"),
});

export const submitResultSchema = z.object({
  screenshotUrl: z.url("Must be a valid URL to the screenshot"),
  selectedWinner: z.string().min(1, "selectedWinner (a user id) is required"),
});

export const resolveDisputeSchema = z.object({
  finalWinner: z.string().min(1, "finalWinner (a user id) is required"),
  resolution: z.string().trim().min(3, "A resolution note is required").max(500),
});

export const payoutSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  amount: z.number().positive("Amount must be greater than zero"),
});
