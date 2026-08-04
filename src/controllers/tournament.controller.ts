import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../utils/ApiResponse";
import { getPagination, buildMeta } from "../utils/pagination";
import * as tournamentService from "../services/tournament.service";
import { Game, TournamentMode } from "../models/tournament.model";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await tournamentService.createTournament(req.user!.id, req.body);
  sendSuccess(res, 201, { tournament }, "Tournament submitted for admin review");
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await tournamentService.listTournaments(
    {
      game: req.query.game as Game | undefined,
      mode: req.query.mode as TournamentMode | undefined,
    },
    skip,
    limit
  );
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  // Room credentials are only included when the requester is a registered participant,
  // the organizer, or an admin — the service decides, not the caller.
  const tournament = await tournamentService.getTournamentById(req.params.id, req.user?.id, req.user?.role);
  sendSuccess(res, 200, { tournament });
});

export const updateRoomCredentials = asyncHandler(async (req: Request, res: Response) => {
  const { roomId, roomPassword } = req.body;
  const tournament = await tournamentService.updateRoomCredentials(
    req.params.id,
    req.user!.id,
    req.user!.role,
    roomId,
    roomPassword
  );
  sendSuccess(res, 200, { tournament }, "Room credentials updated");
});

export const join = asyncHandler(async (req: Request, res: Response) => {
  const registration = await tournamentService.joinTournament(req.user!.id, req.params.id);
  sendSuccess(res, 201, { registration }, "Joined tournament");
});

export const registrations = asyncHandler(async (req: Request, res: Response) => {
  const list = await tournamentService.listRegistrations(req.params.id, req.user!.id, req.user!.role);
  sendSuccess(res, 200, { registrations: list });
});
