import { Types } from "mongoose";
import { RoomCredential } from "../models/roomCredential.model";
import { Game } from "../models/tournament.model";
import { AppError } from "../utils/AppError";
import { getFeeConfig } from "./feeConfig.service";

export interface CreateRoomInput {
  game: Game;
  roomId: string;
  roomPassword: string;
  note?: string;
}

export async function createRoom(adminId: string, input: CreateRoomInput) {
  return RoomCredential.create({ ...input, createdBy: adminId });
}

export async function listRooms(game: Game | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = {};
  if (game) filter.game = game;

  const [items, total] = await Promise.all([
    RoomCredential.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    RoomCredential.countDocuments(filter),
  ]);
  return { items, total };
}

export async function updateRoom(roomId: string, updates: Partial<CreateRoomInput> & { isActive?: boolean }) {
  const room = await RoomCredential.findByIdAndUpdate(roomId, { $set: updates }, { new: true });
  if (!room) throw new AppError(404, "Room credential not found");
  return room;
}

export async function deleteRoom(roomId: string) {
  const room = await RoomCredential.findByIdAndDelete(roomId);
  if (!room) throw new AppError(404, "Room credential not found");
  return room;
}

/**
 * Hands out a room that hasn't been used within the cooldown window, so two concurrent
 * Quick Matches never land in the same lobby and nobody has to create rooms by hand.
 *
 * The `findOneAndUpdate` is a single atomic operation — under concurrent pairing, two
 * callers can't be handed the same room, because the first one's write moves
 * `lastAssignedAt` outside the other's filter before it matches.
 */
export async function assignRoom(game: Game): Promise<{ roomId: string; roomPassword: string; credentialId: Types.ObjectId }> {
  const config = await getFeeConfig();
  const cooldownCutoff = new Date(Date.now() - config.roomCooldownMinutes * 60 * 1000);

  const room = await RoomCredential.findOneAndUpdate(
    {
      game,
      isActive: true,
      $or: [{ lastAssignedAt: { $exists: false } }, { lastAssignedAt: null }, { lastAssignedAt: { $lte: cooldownCutoff } }],
    },
    { $set: { lastAssignedAt: new Date() }, $inc: { timesAssigned: 1 } },
    { new: true, sort: { lastAssignedAt: 1 } } // least-recently-used first
  );

  if (!room) {
    throw new AppError(
      503,
      "No Quick Match room is free right now — every room is still cooling down. Please try again shortly."
    );
  }

  return { roomId: room.roomId, roomPassword: room.roomPassword, credentialId: room._id };
}

/** How many rooms are usable right now vs. cooling down — surfaced on the admin room page. */
export async function getRoomAvailability() {
  const config = await getFeeConfig();
  const cooldownCutoff = new Date(Date.now() - config.roomCooldownMinutes * 60 * 1000);

  const freeFilter = {
    isActive: true,
    $or: [{ lastAssignedAt: { $exists: false } }, { lastAssignedAt: null }, { lastAssignedAt: { $lte: cooldownCutoff } }],
  };

  const [total, active, available] = await Promise.all([
    RoomCredential.countDocuments(),
    RoomCredential.countDocuments({ isActive: true }),
    RoomCredential.countDocuments(freeFilter),
  ]);

  return { total, active, available, coolingDown: active - available, cooldownMinutes: config.roomCooldownMinutes };
}
