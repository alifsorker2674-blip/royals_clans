import { z } from "zod";

export const createRoomSchema = z.object({
  game: z.enum(["freefire", "bloodstrike"]),
  roomId: z.string().trim().min(1, "Room ID is required").max(50),
  roomPassword: z.string().trim().min(1, "Room password is required").max(50),
  note: z.string().trim().max(200).optional(),
});

export const updateRoomSchema = z.object({
  game: z.enum(["freefire", "bloodstrike"]).optional(),
  roomId: z.string().trim().min(1).max(50).optional(),
  roomPassword: z.string().trim().min(1).max(50).optional(),
  note: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
});
