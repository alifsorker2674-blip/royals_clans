import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../utils/ApiResponse";
import { getPagination, buildMeta } from "../utils/pagination";
import * as matchService from "../services/match.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const match = await matchService.createMatch(req.params.tournamentId, req.body.round, req.user!.id, req.user!.role);
  sendSuccess(res, 201, { match }, "Match created");
});

export const listForTournament = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await matchService.listMatchesForTournament(req.params.tournamentId, skip, limit);
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const match = await matchService.getMatchById(req.params.id);
  sendSuccess(res, 200, { match });
});

export const submitResult = asyncHandler(async (req: Request, res: Response) => {
  const { screenshotUrl, selectedWinner } = req.body;
  const match = await matchService.submitResult(req.params.id, req.user!.id, screenshotUrl, selectedWinner);
  const message =
    match.status === "auto_confirmed"
      ? "Result confirmed"
      : match.status === "under_review"
        ? "Submissions disagree — this match is now under admin review"
        : "Result submitted, waiting for another submission to confirm";
  sendSuccess(res, 200, { match }, message);
});
