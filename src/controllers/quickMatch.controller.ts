import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import * as quickMatchService from "../services/quickMatch.service";

export const joinQueue = asyncHandler(async (req: Request, res: Response) => {
  const { game, entryFee } = req.body;
  const result = await quickMatchService.joinQueue(req.user!.id, game, entryFee);
  sendSuccess(
    res,
    result.matched ? 201 : 202,
    result,
    result.matched ? "Match found — your room is ready!" : "You're in the queue — waiting for an opponent."
  );
});

export const cancelQueue = asyncHandler(async (req: Request, res: Response) => {
  await quickMatchService.cancelQueue(req.user!.id);
  sendSuccess(res, 200, null, "Left the Quick Match queue");
});

export const myStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await quickMatchService.getMyStatus(req.user!.id);
  sendSuccess(res, 200, status);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const match = await quickMatchService.getMatchById(req.params.id, req.user!.id, req.user!.role);
  sendSuccess(res, 200, { match });
});

export const submitResult = asyncHandler(async (req: Request, res: Response) => {
  const { screenshotUrl, selectedWinner } = req.body;
  const match = await quickMatchService.submitResult(req.params.id, req.user!.id, screenshotUrl, selectedWinner);

  const message =
    match?.status === "confirmed"
      ? "Result confirmed — prize paid out!"
      : match?.status === "under_review"
        ? "Submissions disagree — this match is now under admin review"
        : "Result submitted, waiting for your opponent to confirm";

  sendSuccess(res, 200, { match }, message);
});
