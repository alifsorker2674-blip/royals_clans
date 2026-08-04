import { z } from "zod";

export const joinQueueSchema = z.object({
  game: z.enum(["freefire", "bloodstrike"]),
  entryFee: z.number().positive("Entry fee must be greater than zero"),
});

export const submitQuickMatchResultSchema = z.object({
  screenshotUrl: z.url("Must be a valid URL to the screenshot"),
  selectedWinner: z.string().min(1, "selectedWinner (a user id) is required"),
});

export const resolveQuickMatchSchema = z.object({
  winnerId: z.string().min(1, "winnerId is required"),
  resolution: z.string().trim().min(3, "A resolution note is required").max(500),
});
