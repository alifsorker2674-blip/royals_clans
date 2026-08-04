import { Types } from "mongoose";
import { Match } from "../models/match.model";
import { Dispute } from "../models/dispute.model";
import { Tournament } from "../models/tournament.model";
import { Registration } from "../models/registration.model";
import { AppError } from "../utils/AppError";
import { creditWallet } from "./wallet.service";
import { notifyAdmins, sendPushToUser } from "./notification.service";
import { awardWin } from "./ranking.service";

async function assertOrganizerOrAdmin(tournamentId: string, requesterId: string, requesterRole: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new AppError(404, "Tournament not found");
  const isOwner = tournament.createdBy.toString() === requesterId;
  if (!isOwner && requesterRole !== "admin") {
    throw new AppError(403, "Only the organizer or an admin can do this");
  }
  return tournament;
}

export async function createMatch(
  tournamentId: string,
  round: string,
  requesterId: string,
  requesterRole: string
) {
  await assertOrganizerOrAdmin(tournamentId, requesterId, requesterRole);
  return Match.create({ tournamentId, round, status: "pending", submissions: [] });
}

export async function listMatchesForTournament(tournamentId: string, skip: number, limit: number) {
  const [items, total] = await Promise.all([
    Match.find({ tournamentId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Match.countDocuments({ tournamentId }),
  ]);
  return { items, total };
}

export async function getMatchById(matchId: string) {
  const match = await Match.findById(matchId);
  if (!match) throw new AppError(404, "Match not found");
  return match;
}

/**
 * Dual-confirmation result submission (see docs/PRD.md "Match Validation").
 * MVP simplification: as soon as 2+ submissions agree on the same winner, the match
 * auto-confirms. Disagreeing submissions immediately flip the match to "under_review"
 * and open a dispute for an admin to resolve — never auto-resolved in anyone's favor.
 */
export async function submitResult(
  matchId: string,
  userId: string,
  screenshotUrl: string,
  selectedWinner: string
) {
  const match = await Match.findById(matchId);
  if (!match) throw new AppError(404, "Match not found");
  if (match.status === "auto_confirmed" || match.status === "admin_resolved") {
    throw new AppError(400, "This match's result has already been finalized");
  }

  const tournament = await Tournament.findById(match.tournamentId);
  if (!tournament) throw new AppError(404, "Tournament not found");

  const isOrganizer = tournament.createdBy.toString() === userId;
  const isRegistered = await Registration.exists({
    tournamentId: match.tournamentId,
    userId,
    paymentStatus: "approved",
  });
  if (!isOrganizer && !isRegistered) {
    throw new AppError(403, "Only registered participants or the organizer can submit a result");
  }

  // A resubmission from the same user replaces their previous submission.
  match.submissions = match.submissions.filter((s) => s.userId.toString() !== userId);
  match.submissions.push({
    userId: new Types.ObjectId(userId),
    screenshotUrl,
    selectedWinner: new Types.ObjectId(selectedWinner),
    submittedAt: new Date(),
  });

  if (match.submissions.length >= 2) {
    const distinctWinners = new Set(match.submissions.map((s) => s.selectedWinner.toString()));
    if (distinctWinners.size === 1) {
      match.status = "auto_confirmed";
      match.finalWinner = match.submissions[0].selectedWinner;
      await awardWin(match.finalWinner, tournament.game, "tournament");
    } else {
      match.status = "under_review";
      const existingOpenDispute = await Dispute.exists({ matchId: match._id, status: "open" });
      if (!existingOpenDispute) {
        await Dispute.create({
          matchId: match._id,
          reason: "Submitted results disagree on the winner",
        });
        notifyAdmins({
          title: "Match dispute opened",
          body: `Submissions disagree for "${tournament.title}" (${match.round})`,
          url: "/disputes",
        });
      }
    }
  }

  await match.save();
  return match;
}

export async function payoutPrize(matchId: string, adminId: string, userId: string, amount: number) {
  const match = await Match.findById(matchId);
  if (!match) throw new AppError(404, "Match not found");
  if (match.status !== "auto_confirmed" && match.status !== "admin_resolved") {
    throw new AppError(400, "This match's result is not finalized yet");
  }

  const { transaction } = await creditWallet(userId, amount, "prizePayout", {
    relatedTournament: match.tournamentId,
    reviewedBy: adminId,
  });

  sendPushToUser(userId, {
    title: "Prize payout received!",
    body: `You received ৳${amount} for ${match.round}.`,
    url: "/wallet",
  });

  return transaction;
}

// --- Admin dispute resolution ---

export async function listOpenDisputes(skip: number, limit: number) {
  const filter = { status: "open" as const };
  const [items, total] = await Promise.all([
    Dispute.find(filter)
      .populate({ path: "matchId", populate: { path: "tournamentId", select: "title game" } })
      .populate({ path: "quickMatchId", populate: { path: "players", select: "name email" } })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    Dispute.countDocuments(filter),
  ]);
  return { items, total };
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  finalWinner: string,
  resolution: string
) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute || dispute.status !== "open") throw new AppError(400, "No open dispute found with this id");

  const match = await Match.findById(dispute.matchId);
  if (!match) throw new AppError(404, "Match not found");

  match.status = "admin_resolved";
  match.finalWinner = new Types.ObjectId(finalWinner);
  match.verifiedBy = new Types.ObjectId(adminId);
  await match.save();

  dispute.status = "resolved";
  dispute.resolvedBy = new Types.ObjectId(adminId);
  dispute.resolution = resolution;
  await dispute.save();

  const tournament = await Tournament.findById(match.tournamentId);
  if (tournament) await awardWin(finalWinner, tournament.game, "tournament");

  sendPushToUser(finalWinner, {
    title: "Dispute resolved",
    body: `You were confirmed as the winner for ${match.round}: ${resolution}`,
    url: "/wallet",
  });

  return { match, dispute };
}
