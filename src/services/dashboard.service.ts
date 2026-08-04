import { User } from "../models/user.model";
import { Transaction } from "../models/transaction.model";
import { Tournament } from "../models/tournament.model";
import { Registration } from "../models/registration.model";
import { Dispute } from "../models/dispute.model";
import { AppError } from "../utils/AppError";

export async function getPlayerDashboard(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, "User not found");

  const [recentTransactions, tournamentsCreated, tournamentsJoined] = await Promise.all([
    Transaction.find({ userId }).sort({ createdAt: -1 }).limit(5),
    Tournament.countDocuments({ createdBy: userId }),
    Registration.countDocuments({ userId }),
  ]);

  return {
    walletBalance: user.walletBalance,
    recentTransactions,
    tournamentsCreated,
    tournamentsJoined,
  };
}

export async function getAdminOverview() {
  const [
    totalUsers,
    bannedUsers,
    pendingDeposits,
    pendingWithdrawals,
    pendingTournaments,
    activeTournaments,
    totalTournaments,
    openDisputes,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBanned: true }),
    Transaction.countDocuments({ type: "deposit", status: "pending" }),
    Transaction.countDocuments({ type: "withdrawal", status: "pending" }),
    Tournament.countDocuments({ status: "pending" }),
    Tournament.countDocuments({ status: { $in: ["approved", "live"] } }),
    Tournament.countDocuments(),
    Dispute.countDocuments({ status: "open" }),
  ]);

  return {
    users: { total: totalUsers, banned: bannedUsers },
    pendingApprovals: {
      deposits: pendingDeposits,
      withdrawals: pendingWithdrawals,
      tournaments: pendingTournaments,
      disputes: openDisputes,
    },
    tournaments: { active: activeTournaments, total: totalTournaments },
  };
}
