import { Types, PipelineStage } from "mongoose";
import { Ranking, RankingEvent, tierForPoints } from "../models/ranking.model";
import { Clan } from "../models/clan.model";
import { Game } from "../models/tournament.model";

export const POINTS_PER_WIN = { tournament: 50, quickMatch: 20 } as const;

/**
 * Awards ranking points for a confirmed win. Only ever called from results that are
 * `auto_confirmed`/`admin_resolved` — never from pending or disputed matches (see PRD).
 */
export async function awardWin(
  userId: string | Types.ObjectId,
  game: Game,
  source: "tournament" | "quickMatch"
): Promise<void> {
  const points = POINTS_PER_WIN[source];

  const ranking = await Ranking.findOneAndUpdate(
    { userId, game },
    { $inc: { points, wins: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Tier is derived from the post-increment total, so it can only be computed after the update.
  const tier = tierForPoints(ranking.points);
  if (ranking.tier !== tier) {
    ranking.tier = tier;
    await ranking.save();
  }

  await RankingEvent.create({ userId, game, points, source });
}

export async function recordLoss(userId: string | Types.ObjectId, game: Game): Promise<void> {
  await Ranking.findOneAndUpdate(
    { userId, game },
    { $inc: { losses: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function getMyRankings(userId: string) {
  return Ranking.find({ userId }).sort({ points: -1 });
}

export type LeaderboardPeriod = "all" | "weekly" | "monthly";

/**
 * "all" reads cumulative totals straight off `Ranking`; "weekly"/"monthly" aggregate
 * `RankingEvent` over the window, since cumulative totals can't be time-sliced.
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  game: Game | undefined,
  skip: number,
  limit: number
) {
  if (period === "all") {
    const filter: Record<string, unknown> = {};
    if (game) filter.game = game;

    const [items, total] = await Promise.all([
      Ranking.find(filter).populate("userId", "name email").sort({ points: -1 }).skip(skip).limit(limit),
      Ranking.countDocuments(filter),
    ]);

    return {
      items: items.map((r) => ({
        user: r.userId,
        game: r.game,
        points: r.points,
        tier: r.tier,
        wins: r.wins,
        losses: r.losses,
      })),
      total,
    };
  }

  const since = new Date();
  if (period === "weekly") since.setDate(since.getDate() - 7);
  else since.setMonth(since.getMonth() - 1);

  const match: Record<string, unknown> = { createdAt: { $gte: since } };
  if (game) match.game = game;

  const pipeline = [
    { $match: match },
    { $group: { _id: { userId: "$userId", game: "$game" }, points: { $sum: "$points" }, wins: { $sum: 1 } } },
    { $sort: { points: -1 as const } },
    { $skip: skip },
    { $limit: limit },
    { $lookup: { from: "users", localField: "_id.userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        user: { _id: "$user._id", name: "$user.name", email: "$user.email" },
        game: "$_id.game",
        points: 1,
        wins: 1,
      },
    },
  ];

  const [items, totalGroups] = await Promise.all([
    RankingEvent.aggregate(pipeline),
    RankingEvent.aggregate([{ $match: match }, { $group: { _id: { userId: "$userId", game: "$game" } } }, { $count: "n" }]),
  ]);

  return { items, total: totalGroups[0]?.n ?? 0 };
}

/**
 * Clan leaderboard: each clan ranked by the summed career points of its current members.
 * Aggregated from the Clan side so clans with no ranked members still appear (at 0 points).
 */
export async function getClanLeaderboard(game: Game | undefined, skip: number, limit: number) {
  const pipeline: PipelineStage[] = [
    { $unwind: "$members" },
    { $lookup: { from: "rankings", localField: "members", foreignField: "userId", as: "memberRankings" } },
    { $unwind: { path: "$memberRankings", preserveNullAndEmptyArrays: true } },
  ];

  if (game) {
    // Keep unranked-member rows (null) so clans never disappear from the board entirely.
    pipeline.push({ $match: { $or: [{ memberRankings: null }, { "memberRankings.game": game }] } });
  }

  pipeline.push(
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        tag: { $first: "$tag" },
        logoUrl: { $first: "$logoUrl" },
        points: { $sum: { $ifNull: ["$memberRankings.points", 0] } },
        wins: { $sum: { $ifNull: ["$memberRankings.wins", 0] } },
        memberIds: { $addToSet: "$members" },
      },
    },
    { $addFields: { memberCount: { $size: "$memberIds" } } },
    { $project: { memberIds: 0 } },
    { $sort: { points: -1, memberCount: -1 } },
    { $skip: skip },
    { $limit: limit }
  );

  const [items, total] = await Promise.all([Clan.aggregate(pipeline), Clan.countDocuments()]);
  return { items, total };
}
