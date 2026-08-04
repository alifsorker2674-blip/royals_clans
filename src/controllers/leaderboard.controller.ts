import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../utils/ApiResponse";
import { getPagination, buildMeta } from "../utils/pagination";
import * as rankingService from "../services/ranking.service";
import { Game } from "../models/tournament.model";

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const period = (req.query.period as rankingService.LeaderboardPeriod) || "all";
  const { items, total } = await rankingService.getLeaderboard(
    period,
    req.query.game as Game | undefined,
    skip,
    limit
  );
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const myRankings = asyncHandler(async (req: Request, res: Response) => {
  const rankings = await rankingService.getMyRankings(req.user!.id);
  sendSuccess(res, 200, { rankings });
});

export const clanLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await rankingService.getClanLeaderboard(
    req.query.game as Game | undefined,
    skip,
    limit
  );
  sendPaginated(res, items, buildMeta(page, limit, total));
});
