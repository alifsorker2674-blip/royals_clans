import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../utils/ApiResponse";
import { getPagination, buildMeta } from "../utils/pagination";
import * as walletService from "../services/wallet.service";
import * as tournamentService from "../services/tournament.service";
import * as feeConfigService from "../services/feeConfig.service";
import * as userService from "../services/user.service";
import * as matchService from "../services/match.service";
import * as roomService from "../services/roomCredential.service";
import * as quickMatchService from "../services/quickMatch.service";
import * as reportService from "../services/report.service";
import * as siteSettingsService from "../services/siteSettings.service";
import { TransactionType } from "../models/transaction.model";
import { TournamentStatus, Game } from "../models/tournament.model";
import { UserRole } from "../models/user.model";

// --- Transactions (deposit/withdrawal approval queue) ---

export const listPendingTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await walletService.listPendingTransactions(
    skip,
    limit,
    req.query.type as TransactionType | undefined
  );
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const approveTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await walletService.approveTransaction(req.params.id, req.user!.id);
  sendSuccess(res, 200, { transaction }, "Transaction approved");
});

export const rejectTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await walletService.rejectTransaction(req.params.id, req.user!.id, req.body.reason);
  sendSuccess(res, 200, { transaction }, "Transaction rejected");
});

// --- Tournaments (approval queue) ---

export const listTournaments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await tournamentService.listTournamentsForAdmin(
    req.query.status as TournamentStatus | undefined,
    skip,
    limit
  );
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const approveTournament = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await tournamentService.approveTournament(req.params.id, req.user!.id);
  sendSuccess(res, 200, { tournament }, "Tournament approved and published");
});

export const rejectTournament = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await tournamentService.rejectTournament(req.params.id, req.user!.id, req.body.reason);
  sendSuccess(res, 200, { tournament }, "Tournament rejected and create fee refunded");
});

export const createOfficialTournament = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await tournamentService.createOfficialTournament(req.user!.id, req.body);
  sendSuccess(res, 201, { tournament }, "Official tournament created and published");
});

// --- Fee config ---

export const updateFeeConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await feeConfigService.updateFeeConfig(req.body);
  sendSuccess(res, 200, { feeConfig: config }, "Fee configuration updated");
});

// --- Users ---

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await userService.listUsers(
    {
      role: req.query.role as UserRole | undefined,
      isBanned: req.query.isBanned !== undefined ? req.query.isBanned === "true" : undefined,
      search: req.query.search as string | undefined,
    },
    skip,
    limit
  );
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.setBanStatus(req.params.id, true);
  sendSuccess(res, 200, { user }, "User banned");
});

export const unbanUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.setBanStatus(req.params.id, false);
  sendSuccess(res, 200, { user }, "User unbanned");
});

export const changeUserRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.changeRole(req.params.id, req.body.role, req.user!.id);
  sendSuccess(res, 200, { user }, "User role updated");
});

// --- Disputes ---

export const listDisputes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await matchService.listOpenDisputes(skip, limit);
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const resolveDispute = asyncHandler(async (req: Request, res: Response) => {
  const { finalWinner, resolution } = req.body;
  const result = await matchService.resolveDispute(req.params.id, req.user!.id, finalWinner, resolution);
  sendSuccess(res, 200, result, "Dispute resolved");
});

// --- Prize payout ---

export const payoutPrize = asyncHandler(async (req: Request, res: Response) => {
  const { userId, amount } = req.body;
  const transaction = await matchService.payoutPrize(req.params.matchId, req.user!.id, userId, amount);
  sendSuccess(res, 200, { transaction }, "Prize paid out");
});

// --- Quick Match room pool ---

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await roomService.createRoom(req.user!.id, req.body);
  sendSuccess(res, 201, { room }, "Room credential added to the pool");
});

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await roomService.listRooms(req.query.game as Game | undefined, skip, limit);
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await roomService.updateRoom(req.params.id, req.body);
  sendSuccess(res, 200, { room }, "Room credential updated");
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  await roomService.deleteRoom(req.params.id);
  sendSuccess(res, 200, null, "Room credential deleted");
});

export const roomAvailability = asyncHandler(async (_req: Request, res: Response) => {
  const availability = await roomService.getRoomAvailability();
  sendSuccess(res, 200, availability);
});

// --- Quick Match monitoring / resolution ---

export const listQuickMatches = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await quickMatchService.listQuickMatchesForAdmin(
    req.query.status as string | undefined,
    skip,
    limit
  );
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const quickMatchQueueStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await quickMatchService.getQueueStats();
  sendSuccess(res, 200, stats);
});

export const resolveQuickMatch = asyncHandler(async (req: Request, res: Response) => {
  const { winnerId, resolution } = req.body;
  const match = await quickMatchService.resolveQuickMatch(req.params.id, req.user!.id, winnerId, resolution);
  sendSuccess(res, 200, { match }, "Quick Match resolved and prize paid out");
});

// --- Reports & site content ---

export const getReports = asyncHandler(async (_req: Request, res: Response) => {
  const reports = await reportService.getAdminReports();
  sendSuccess(res, 200, reports);
});

export const updateSiteSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await siteSettingsService.updateSiteSettings(req.body);
  sendSuccess(res, 200, { settings }, "Site content updated");
});
