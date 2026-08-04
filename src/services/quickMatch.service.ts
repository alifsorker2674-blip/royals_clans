import { Types } from "mongoose";
import { QuickMatchQueue, QuickMatch } from "../models/quickMatch.model";
import { Game } from "../models/tournament.model";
import { Dispute } from "../models/dispute.model";
import { AppError } from "../utils/AppError";
import { getFeeConfig } from "./feeConfig.service";
import { assignRoom } from "./roomCredential.service";
import { debitWallet, creditWallet } from "./wallet.service";
import { notifyAdmins, sendPushToUser } from "./notification.service";
import { awardWin, recordLoss } from "./ranking.service";
import { User } from "../models/user.model";

/**
 * Joins the Quick Match queue, pairing immediately if someone is already waiting on the
 * same game + entry fee.
 *
 * Money rule (per PRD): the entry fee is only debited once a match actually forms —
 * merely sitting in the queue never touches the wallet, so cancelling costs nothing.
 * Balance is still checked up-front so we don't pair someone who can't pay.
 */
export async function joinQueue(userId: string, game: Game, entryFee: number) {
  const config = await getFeeConfig();
  if (!config.quickMatchEntryFees.includes(entryFee)) {
    throw new AppError(400, `Entry fee must be one of: ${config.quickMatchEntryFees.join(", ")}`);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, "User not found");
  if (user.walletBalance < entryFee) throw new AppError(400, "Insufficient wallet balance for this entry fee");

  const alreadyWaiting = await QuickMatchQueue.findOne({ userId, status: "waiting" });
  if (alreadyWaiting) throw new AppError(409, "You are already in the Quick Match queue");

  const activeMatch = await QuickMatch.findOne({ players: userId, status: { $in: ["active", "awaiting_results"] } });
  if (activeMatch) throw new AppError(409, "You already have a Quick Match in progress");

  // Atomically claim the oldest waiting opponent so two joiners can't grab the same person.
  const opponent = await QuickMatchQueue.findOneAndUpdate(
    { game, entryFee, status: "waiting", userId: { $ne: userId } },
    { $set: { status: "matched" } },
    { new: true, sort: { createdAt: 1 } }
  );

  if (!opponent) {
    const entry = await QuickMatchQueue.create({ userId, game, entryFee, status: "waiting" });
    return { matched: false as const, queueEntry: entry };
  }

  // An opponent was claimed — from here on, failures must release them back into the queue.
  try {
    const room = await assignRoom(game);

    const pool = entryFee * 2;
    const platformFee = Math.round((pool * config.quickMatchServiceFeePct) / 100);
    const prizeAmount = pool - platformFee;

    await debitWallet(userId, entryFee, "quickMatchEntry");
    try {
      await debitWallet(opponent.userId, entryFee, "quickMatchEntry");
    } catch (err) {
      // Opponent went broke between queueing and pairing — refund the joiner, drop the opponent.
      await creditWallet(userId, entryFee, "refund");
      await QuickMatchQueue.findByIdAndUpdate(opponent._id, { $set: { status: "cancelled" } });
      throw err;
    }

    const match = await QuickMatch.create({
      game,
      players: [opponent.userId, new Types.ObjectId(userId)],
      entryFee,
      prizeAmount,
      platformFee,
      roomId: room.roomId,
      roomPassword: room.roomPassword,
      roomCredentialId: room.credentialId,
      status: "active",
    });

    await QuickMatchQueue.findByIdAndUpdate(opponent._id, { $set: { matchId: match._id } });

    sendPushToUser(opponent.userId.toString(), {
      title: "Quick Match found!",
      body: `Room ${room.roomId} is ready — ৳${prizeAmount} to the winner.`,
      url: "/quick-match",
    });

    return { matched: true as const, match };
  } catch (err) {
    await QuickMatchQueue.findByIdAndUpdate(opponent._id, { $set: { status: "waiting" } });
    throw err;
  }
}

export async function cancelQueue(userId: string) {
  const entry = await QuickMatchQueue.findOneAndUpdate(
    { userId, status: "waiting" },
    { $set: { status: "cancelled" } },
    { new: true }
  );
  if (!entry) throw new AppError(400, "You are not currently in the Quick Match queue");
  return entry;
}

/** Polled by the waiting player's UI until a match forms. */
export async function getMyStatus(userId: string) {
  const activeMatch = await QuickMatch.findOne({
    players: userId,
    status: { $in: ["active", "awaiting_results", "under_review"] },
  }).populate("players", "name email");

  if (activeMatch) return { state: "matched" as const, match: activeMatch };

  const waiting = await QuickMatchQueue.findOne({ userId, status: "waiting" });
  if (waiting) return { state: "waiting" as const, queueEntry: waiting };

  return { state: "idle" as const };
}

export async function getMatchById(matchId: string, userId: string, role: string) {
  const match = await QuickMatch.findById(matchId).populate("players", "name email");
  if (!match) throw new AppError(404, "Quick Match not found");

  const isPlayer = match.players.some((p) => (p._id ? p._id.toString() : p.toString()) === userId);
  if (!isPlayer && role !== "admin") {
    throw new AppError(403, "Only the players in this match (or an admin) can view it");
  }
  return match;
}

/**
 * Same dual-confirmation rule as tournament matches: two agreeing submissions confirm
 * the result and pay out instantly; the moment they disagree it goes to admin review
 * and nothing is paid until a human decides.
 */
export async function submitResult(
  matchId: string,
  userId: string,
  screenshotUrl: string,
  selectedWinner: string
) {
  const match = await QuickMatch.findById(matchId);
  if (!match) throw new AppError(404, "Quick Match not found");

  const isPlayer = match.players.some((p) => p.toString() === userId);
  if (!isPlayer) throw new AppError(403, "Only the players in this match can submit a result");

  if (match.status === "confirmed" || match.status === "resolved") {
    throw new AppError(400, "This match's result has already been finalized");
  }
  if (!match.players.some((p) => p.toString() === selectedWinner)) {
    throw new AppError(400, "The selected winner must be one of the two players in this match");
  }

  match.submissions = match.submissions.filter((s) => s.userId.toString() !== userId);
  match.submissions.push({
    userId: new Types.ObjectId(userId),
    screenshotUrl,
    selectedWinner: new Types.ObjectId(selectedWinner),
    submittedAt: new Date(),
  });
  match.status = "awaiting_results";

  if (match.submissions.length >= 2) {
    const distinctWinners = new Set(match.submissions.map((s) => s.selectedWinner.toString()));
    if (distinctWinners.size === 1) {
      match.status = "confirmed";
      match.winnerId = match.submissions[0].selectedWinner;
      await match.save();
      await settleMatch(match._id.toString());
      return QuickMatch.findById(match._id);
    }

    match.status = "under_review";
    const existing = await Dispute.exists({ quickMatchId: match._id, status: "open" });
    if (!existing) {
      await Dispute.create({ quickMatchId: match._id, reason: "Quick Match results disagree on the winner" });
      notifyAdmins({
        title: "Quick Match dispute",
        body: `Players disagree on the winner of a ৳${match.entryFee} Quick Match.`,
        url: "/disputes",
      });
    }
  }

  await match.save();
  return match;
}

/** Credits the winner and awards ranking points. Idempotent via the `paidOut` flag. */
async function settleMatch(matchId: string, adminId?: string) {
  const match = await QuickMatch.findById(matchId);
  if (!match || !match.winnerId || match.paidOut) return;

  await creditWallet(match.winnerId, match.prizeAmount, "prizePayout", { reviewedBy: adminId });
  match.paidOut = true;
  await match.save();

  await awardWin(match.winnerId, match.game, "quickMatch");
  const loser = match.players.find((p) => p.toString() !== match.winnerId!.toString());
  if (loser) await recordLoss(loser, match.game);

  sendPushToUser(match.winnerId.toString(), {
    title: "You won the Quick Match!",
    body: `৳${match.prizeAmount} has been added to your wallet.`,
    url: "/wallet",
  });
}

/** Admin decides a disputed Quick Match, then payout + ranking run exactly as in the auto path. */
export async function resolveQuickMatch(matchId: string, adminId: string, winnerId: string, resolution: string) {
  const match = await QuickMatch.findById(matchId);
  if (!match) throw new AppError(404, "Quick Match not found");
  if (!match.players.some((p) => p.toString() === winnerId)) {
    throw new AppError(400, "The winner must be one of the two players in this match");
  }

  match.status = "resolved";
  match.winnerId = new Types.ObjectId(winnerId);
  match.verifiedBy = new Types.ObjectId(adminId);
  await match.save();

  await Dispute.findOneAndUpdate(
    { quickMatchId: match._id, status: "open" },
    { $set: { status: "resolved", resolvedBy: adminId, resolution } }
  );

  await settleMatch(matchId, adminId);
  return QuickMatch.findById(matchId);
}

export async function listQuickMatchesForAdmin(status: string | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    QuickMatch.find(filter).populate("players", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    QuickMatch.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getQueueStats() {
  const waiting = await QuickMatchQueue.aggregate([
    { $match: { status: "waiting" } },
    { $group: { _id: { game: "$game", entryFee: "$entryFee" }, count: { $sum: 1 } } },
    { $project: { _id: 0, game: "$_id.game", entryFee: "$_id.entryFee", count: 1 } },
  ]);
  const activeMatches = await QuickMatch.countDocuments({ status: { $in: ["active", "awaiting_results"] } });
  return { waiting, activeMatches };
}
