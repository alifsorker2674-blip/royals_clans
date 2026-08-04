import { z } from "zod";

export const createTournamentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  game: z.enum(["freefire", "bloodstrike"]),
  mode: z.enum(["solo", "duo", "squad"]),
  entryFee: z.number().min(0),
  slots: z.number().int().min(2, "A tournament needs at least 2 slots"),
  prizePool: z.number().min(0),
  prizeDistribution: z.string().trim().max(500).optional(),
  rules: z.string().trim().max(2000).optional(),
  schedule: z.iso.datetime().optional(),
  roomId: z.string().trim().min(1, "Room ID is required").max(50),
  roomPassword: z.string().trim().min(1, "Room password is required").max(50),
});

export const rejectTournamentSchema = z.object({
  reason: z.string().trim().min(3, "A reason is required").max(300),
});

export const updateRoomCredentialsSchema = z.object({
  roomId: z.string().trim().min(1, "Room ID is required").max(50),
  roomPassword: z.string().trim().min(1, "Room password is required").max(50),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
