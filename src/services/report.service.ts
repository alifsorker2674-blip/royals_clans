import { User } from "../models/user.model";
import { Transaction } from "../models/transaction.model";
import { Tournament } from "../models/tournament.model";
import { QuickMatch } from "../models/quickMatch.model";
import { Dispute } from "../models/dispute.model";
import { Clan } from "../models/clan.model";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Platform-wide numbers for the admin Reports page. */
export async function getAdminReports() {
  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [
    totalUsers,
    newUsers7,
    newUsers30,
    txnByType,
    quickMatchFees,
    tournamentsByStatus,
    quickMatchesByStatus,
    openDisputes,
    resolvedDisputes,
    totalClans,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since7 } }),
    User.countDocuments({ createdAt: { $gte: since30 } }),
    Transaction.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    QuickMatch.aggregate([
      { $match: { status: { $in: ["confirmed", "resolved"] } } },
      { $group: { _id: null, total: { $sum: "$platformFee" }, count: { $sum: 1 } } },
    ]),
    Tournament.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    QuickMatch.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Dispute.countDocuments({ status: "open" }),
    Dispute.countDocuments({ status: "resolved" }),
    Clan.countDocuments(),
  ]);

  const byType = new Map<string, { total: number; count: number }>(
    txnByType.map((t) => [t._id as string, { total: t.total, count: t.count }])
  );

  return {
    users: { total: totalUsers, newLast7Days: newUsers7, newLast30Days: newUsers30 },
    // What the platform itself has earned. Create-fee refunds show up in moneyFlow below.
    revenue: {
      tournamentCreateFees: byType.get("tournamentCreateFee")?.total ?? 0,
      quickMatchFees: quickMatchFees[0]?.total ?? 0,
      quickMatchesSettled: quickMatchFees[0]?.count ?? 0,
    },
    // Full approved-transaction breakdown — deposits, withdrawals, entries, payouts, refunds…
    moneyFlow: txnByType.map((t) => ({ type: t._id as string, total: t.total, count: t.count })),
    tournaments: Object.fromEntries(tournamentsByStatus.map((t) => [t._id as string, t.count])),
    quickMatches: Object.fromEntries(quickMatchesByStatus.map((t) => [t._id as string, t.count])),
    disputes: { open: openDisputes, resolved: resolvedDisputes },
    clans: { total: totalClans },
  };
}
