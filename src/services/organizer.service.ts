import { Types } from "mongoose";
import { Tournament } from "../models/tournament.model";
import { Registration } from "../models/registration.model";
import { Transaction } from "../models/transaction.model";

/**
 * Everything an organizer needs to see about the tournaments they host.
 * Note: entry fees currently sit in the platform ledger (players are debited but nobody is
 * auto-credited) — "entryFeesCollected" is the pool gathered for their tournaments, not money
 * already in the organizer's wallet. Prize payouts remain explicit admin actions.
 */
export async function getOrganizerSummary(userId: string) {
  const tournaments = await Tournament.find({ createdBy: userId }).sort({ createdAt: -1 });
  const ids = tournaments.map((t) => t._id);

  const [regCounts, entryAgg, createFeeAgg] = await Promise.all([
    Registration.aggregate([
      { $match: { tournamentId: { $in: ids }, paymentStatus: "approved" } },
      { $group: { _id: "$tournamentId", count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { type: "tournamentEntry", status: "approved", relatedTournament: { $in: ids } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: new Types.ObjectId(userId), type: "tournamentCreateFee", status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const countMap = new Map<string, number>(regCounts.map((r) => [r._id.toString(), r.count]));
  const byStatus: Record<string, number> = {};
  for (const t of tournaments) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;

  return {
    totals: {
      tournaments: tournaments.length,
      byStatus,
      participants: [...countMap.values()].reduce((a, b) => a + b, 0),
      entryFeesCollected: entryAgg[0]?.total ?? 0,
      createFeesPaid: createFeeAgg[0]?.total ?? 0,
    },
    tournaments: tournaments.map((t) => ({
      _id: t._id,
      title: t.title,
      game: t.game,
      mode: t.mode,
      status: t.status,
      entryFee: t.entryFee,
      slots: t.slots,
      prizePool: t.prizePool,
      participants: countMap.get(t._id.toString()) ?? 0,
      schedule: t.schedule,
      createdAt: t.createdAt,
    })),
  };
}
