import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import * as feeConfigService from "../services/feeConfig.service";

export const getFeeConfig = asyncHandler(async (_req: Request, res: Response) => {
  const config = await feeConfigService.getFeeConfig();
  sendSuccess(res, 200, { feeConfig: config });
});
