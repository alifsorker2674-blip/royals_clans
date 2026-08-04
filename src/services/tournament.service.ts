import { Types } from "mongoose";
import { Tournament, ITournament, TournamentStatus, Game, TournamentMode } from "../models/tournament.model";
import { Registration } from "../models/registration.model";
import { User } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { calculateTournamentCreateFee } from "./feeConfig.service";
import { debitWallet, creditWallet } from "./wallet.service";
import { notifyAdmins, sendPushToUser } from "./notification.service";

export interface CreateTournamentInput {
  title: string;
  game: Game;
  mode: TournamentMode;
  entryFee: number;
  slots: number;
  prizePool: number;
  prizeDistribution?: string;
  rules?: string;
  schedule?: string;
  roomId: string;
  roomPassword: string;
}

/** Fields only registered participants / the organizer / admins may see. */
const PRIVATE_TOURNAMENT_FIELDS = "-roomId -roomPassword";

/**
 * True when the requester is allowed to see the tournament's lobby credentials:
 * the organizer, an admin, or a player who has actually registered (and paid).
 */
async function canSeeRoomCredentials(
  tournament: ITournament,
  requesterId?: string,
  requesterRole?: string
): Promise<boolean> {
  if (!requesterId) return false;
  if (requesterRole === "admin") return true;
  if (tournament.createdBy.toString() === requesterId) return true;

  const registered = await Registration.exists({
    tournamentId: tournament._id,
    userId: requesterId,
    paymentStatus: "approved",
  });
  return Boolean(registered);
}

export async function createTournament(userId: string, input: CreateTournamentInput) {
  const createFee = await calculateTournamentCreateFee(input.slots);

  // Debit first: if the organizer can't afford the create fee, no tournament should exist at all.
  await debitWallet(userId, createFee, "tournamentCreateFee");

  const tournament = await Tournament.create({
    ...input,
    schedule: input.schedule ? new Date(input.schedule) : undefined,
    createFeeCharged: createFee,
    createdBy: userId,
    status: "pending",
  });

  const organizer = await User.findById(userId);
  notifyAdmins({
    title: "New tournament pending review",
    body: `"${tournament.title}" by ${organizer?.name ?? "a player"}`,
    url: "/tournaments",
  });

  return tournament;
}

/**
 * Admin-hosted ("official") tournament — goes live immediately with no create fee,
 * since the platform is both the organizer and the approver.
 */
export async function createOfficialTournament(adminId: string, input: CreateTournamentInput) {
  return Tournament.create({
    ...input,
    schedule: input.schedule ? new Date(input.schedule) : undefined,
    createFeeCharged: 0,
    createdBy: adminId,
    approvedBy: adminId,
    status: "approved",
    isOfficial: true,
  });
}

/** Organizer/admin can update the lobby credentials (room IDs are often only known near match time). */
export async function updateRoomCredentials(
  tournamentId: string,
  requesterId: string,
  requesterRole: string,
  roomId: string,
  roomPassword: string
) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new AppError(404, "Tournament not found");

  const isOwner = tournament.createdBy.toString() === requesterId;
  if (!isOwner && requesterRole !== "admin") {
    throw new AppError(403, "Only the organizer or an admin can update room credentials");
  }

  tournament.roomId = roomId;
  tournament.roomPassword = roomPassword;
  await tournament.save();
  return tournament;
}

export async function listTournaments(
  filters: { game?: Game; mode?: TournamentMode; status?: TournamentStatus },
  skip: number,
  limit: number
) {
  // Public listing only ever shows tournaments an admin has approved/progressed — never "pending" or "rejected".
  const filter: Record<string, unknown> = {
    status: filters.status ?? { $in: ["approved", "live", "completed"] },
  };
  if (filters.game) filter.game = filters.game;
  if (filters.mode) filter.mode = filters.mode;

  // Room credentials are always stripped from list responses — nobody browsing needs them.
  const [items, total] = await Promise.all([
    Tournament.find(filter).select(PRIVATE_TOURNAMENT_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Tournament.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getTournamentById(id: string, requesterId?: string, requesterRole?: string) {
  const tournament = await Tournament.findById(id);
  if (!tournament) throw new AppError(404, "Tournament not found");

  if (await canSeeRoomCredentials(tournament, requesterId, requesterRole)) {
    return tournament;
  }

  // Strip lobby credentials for everyone else (guests, and players who haven't joined).
  const safe = tournament.toObject();
  delete (safe as Partial<ITournament>).roomId;
  delete (safe as Partial<ITournament>).roomPassword;
  return safe;
}

export async function joinTournament(userId: string, tournamentId: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new AppError(404, "Tournament not found");
  if (tournament.status !== "approved" && tournament.status !== "live") {
    throw new AppError(400, "This tournament is not open for registration");
  }

  const existing = await Registration.findOne({ tournamentId, userId });
  if (existing) throw new AppError(409, "You are already registered for this tournament");

  const registeredCount = await Registration.countDocuments({ tournamentId, paymentStatus: "approved" });
  if (registeredCount >= tournament.slots) throw new AppError(400, "This tournament is full");

  let entryTransactionId: Types.ObjectId | undefined;
  if (tournament.entryFee > 0) {
    const { transaction } = await debitWallet(userId, tournament.entryFee, "tournamentEntry", {
      relatedTournament: tournament._id,
    });
    entryTransactionId = transaction._id;
  }

  const registration = await Registration.create({
    tournamentId,
    userId,
    paymentStatus: "approved",
    entryTransactionId,
  });

  return registration;
}

export async function listRegistrations(tournamentId: string, requesterId: string, requesterRole: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new AppError(404, "Tournament not found");

  const isOwner = tournament.createdBy.toString() === requesterId;
  if (!isOwner && requesterRole !== "admin") {
    throw new AppError(403, "Only the organizer or an admin can view the participant list");
  }

  return Registration.find({ tournamentId }).populate("userId", "name email");
}

// --- Admin-only workflow ---

export async function listTournamentsForAdmin(status: TournamentStatus | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = status ? { status } : {};
  const [items, total] = await Promise.all([
    Tournament.find(filter).populate("createdBy", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Tournament.countDocuments(filter),
  ]);
  return { items, total };
}

export async function approveTournament(tournamentId: string, adminId: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new AppError(404, "Tournament not found");
  if (tournament.status !== "pending") throw new AppError(400, "Only pending tournaments can be approved");

  tournament.status = "approved";
  tournament.approvedBy = new Types.ObjectId(adminId);
  await tournament.save();

  sendPushToUser(tournament.createdBy.toString(), {
    title: "Tournament approved",
    body: `"${tournament.title}" has been approved and is now live on the Marketplace.`,
    url: `/tournaments/${tournament._id}`,
  });

  return tournament;
}

export async function rejectTournament(tournamentId: string, adminId: string, reason: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new AppError(404, "Tournament not found");
  if (tournament.status !== "pending") throw new AppError(400, "Only pending tournaments can be rejected");

  tournament.status = "rejected";
  tournament.approvedBy = new Types.ObjectId(adminId);
  tournament.rejectionReason = reason;
  await tournament.save();

  // Refund the create fee the organizer already paid, since the tournament never went live.
  if (tournament.createFeeCharged > 0) {
    await creditWallet(tournament.createdBy, tournament.createFeeCharged, "refund", {
      relatedTournament: tournament._id,
      reviewedBy: adminId,
    });
  }

  sendPushToUser(tournament.createdBy.toString(), {
    title: "Tournament rejected",
    body: `"${tournament.title}" was rejected: ${reason} (create fee refunded)`,
    url: "/tournaments/create",
  });

  return tournament;
}
