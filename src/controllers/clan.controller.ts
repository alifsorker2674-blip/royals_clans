import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../utils/ApiResponse";
import { getPagination, buildMeta } from "../utils/pagination";
import * as clanService from "../services/clan.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const clan = await clanService.createClan(req.user!.id, req.body);
  sendSuccess(res, 201, { clan }, "Clan created");
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await clanService.listClans(req.query.search as string | undefined, skip, limit);
  sendPaginated(res, items, buildMeta(page, limit, total));
});

export const myClan = asyncHandler(async (req: Request, res: Response) => {
  const clan = await clanService.getMyClan(req.user!.id);
  sendSuccess(res, 200, { clan });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const clan = await clanService.getClanById(req.params.id);
  sendSuccess(res, 200, { clan });
});

export const join = asyncHandler(async (req: Request, res: Response) => {
  const clan = await clanService.joinClan(req.user!.id, req.params.id);
  sendSuccess(res, 200, { clan }, "Joined clan");
});

export const leave = asyncHandler(async (req: Request, res: Response) => {
  const result = await clanService.leaveClan(req.user!.id, req.params.id);
  sendSuccess(res, 200, result, result.deleted ? "You left — the empty clan was deleted" : "Left clan");
});

export const kick = asyncHandler(async (req: Request, res: Response) => {
  const clan = await clanService.kickMember(req.user!.id, req.user!.role, req.params.id, req.body.userId);
  sendSuccess(res, 200, { clan }, "Member kicked");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await clanService.deleteClan(req.user!.id, req.user!.role, req.params.id);
  sendSuccess(res, 200, null, "Clan deleted");
});
