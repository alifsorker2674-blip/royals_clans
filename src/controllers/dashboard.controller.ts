import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import * as dashboardService from "../services/dashboard.service";

export const getMyDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getPlayerDashboard(req.user!.id);
  sendSuccess(res, 200, dashboard);
});

export const getAdminOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await dashboardService.getAdminOverview();
  sendSuccess(res, 200, overview);
});
