import { Types } from "mongoose";
import { Clan } from "../models/clan.model";
import { Ranking } from "../models/ranking.model";
import { AppError } from "../utils/AppError";

/** One clan per player, max roster size — keeps the model simple for launch. */
const MAX_MEMBERS = 50;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createClan(userId: string, input: { name: string; tag: string; logoUrl?: string }) {
  const alreadyInClan = await Clan.exists({ members: userId });
  if (alreadyInClan) throw new AppError(409, "You are already in a clan — leave it before creating a new one");

  return Clan.create({
    name: input.name,
    tag: input.tag.toUpperCase(),
    logoUrl: input.logoUrl || undefined,
    ownerId: userId,
    members: [userId],
  });
}

export async function listClans(search: string | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { tag: rx }];
  }

  const [clans, total] = await Promise.all([
    Clan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Clan.countDocuments(filter),
  ]);

  const items = clans.map((c) => ({
    _id: c._id,
    name: c.name,
    tag: c.tag,
    logoUrl: c.logoUrl,
    memberCount: c.members.length,
    createdAt: c.createdAt,
  }));
  return { items, total };
}

export async function getMyClan(userId: string) {
  return Clan.findOne({ members: userId });
}

/** Clan detail with each member's aggregated ranking stats (across games). */
export async function getClanById(clanId: string) {
  const clan = await Clan.findById(clanId).populate<{ members: { _id: Types.ObjectId; name: string }[] }>(
    "members",
    "name"
  );
  if (!clan) throw new AppError(404, "Clan not found");

  const memberIds = clan.members.map((m) => m._id);
  const stats = await Ranking.aggregate([
    { $match: { userId: { $in: memberIds } } },
    {
      $group: {
        _id: "$userId",
        points: { $sum: "$points" },
        wins: { $sum: "$wins" },
        losses: { $sum: "$losses" },
      },
    },
  ]);
  const statMap = new Map<string, { points: number; wins: number; losses: number }>(
    stats.map((s) => [s._id.toString(), { points: s.points, wins: s.wins, losses: s.losses }])
  );

  const members = clan.members
    .map((m) => {
      const s = statMap.get(m._id.toString());
      return {
        _id: m._id,
        name: m.name,
        points: s?.points ?? 0,
        wins: s?.wins ?? 0,
        losses: s?.losses ?? 0,
        isOwner: m._id.toString() === clan.ownerId.toString(),
      };
    })
    .sort((a, b) => b.points - a.points);

  return {
    _id: clan._id,
    name: clan.name,
    tag: clan.tag,
    logoUrl: clan.logoUrl,
    ownerId: clan.ownerId,
    createdAt: clan.createdAt,
    memberCount: members.length,
    totalPoints: members.reduce((sum, m) => sum + m.points, 0),
    members,
  };
}

export async function joinClan(userId: string, clanId: string) {
  const alreadyInClan = await Clan.exists({ members: userId });
  if (alreadyInClan) throw new AppError(409, "You are already in a clan — leave it before joining another");

  const clan = await Clan.findById(clanId);
  if (!clan) throw new AppError(404, "Clan not found");
  if (clan.members.length >= MAX_MEMBERS) throw new AppError(400, "This clan is full");

  await Clan.findByIdAndUpdate(clanId, { $addToSet: { members: userId } });
  return Clan.findById(clanId);
}

export async function leaveClan(userId: string, clanId: string) {
  const clan = await Clan.findById(clanId);
  if (!clan) throw new AppError(404, "Clan not found");
  if (!clan.members.some((m) => m.toString() === userId)) {
    throw new AppError(400, "You are not a member of this clan");
  }

  if (clan.ownerId.toString() === userId) {
    if (clan.members.length > 1) {
      throw new AppError(400, "The owner can't leave while the clan has other members — kick them first or delete the clan");
    }
    // Last member out — the clan dissolves.
    await Clan.deleteOne({ _id: clanId });
    return { deleted: true as const };
  }

  await Clan.findByIdAndUpdate(clanId, { $pull: { members: userId } });
  return { deleted: false as const };
}

export async function kickMember(requesterId: string, requesterRole: string, clanId: string, targetUserId: string) {
  const clan = await Clan.findById(clanId);
  if (!clan) throw new AppError(404, "Clan not found");

  const isOwner = clan.ownerId.toString() === requesterId;
  if (!isOwner && requesterRole !== "admin") {
    throw new AppError(403, "Only the clan owner or an admin can kick members");
  }
  if (targetUserId === clan.ownerId.toString()) throw new AppError(400, "The clan owner can't be kicked");
  if (!clan.members.some((m) => m.toString() === targetUserId)) {
    throw new AppError(400, "That user is not a member of this clan");
  }

  await Clan.findByIdAndUpdate(clanId, { $pull: { members: targetUserId } });
  return Clan.findById(clanId);
}

export async function deleteClan(requesterId: string, requesterRole: string, clanId: string) {
  const clan = await Clan.findById(clanId);
  if (!clan) throw new AppError(404, "Clan not found");

  const isOwner = clan.ownerId.toString() === requesterId;
  if (!isOwner && requesterRole !== "admin") {
    throw new AppError(403, "Only the clan owner or an admin can delete a clan");
  }

  await Clan.deleteOne({ _id: clanId });
}
