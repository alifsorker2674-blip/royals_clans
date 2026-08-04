import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../utils/ApiResponse";
import { getPagination, buildMeta } from "../utils/pagination";
import { AppError } from "../utils/AppError";
import { User } from "../models/user.model";
import * as walletService from "../services/wallet.service";

export const getBalance = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError(404, "User not found");
  sendSuccess(res, 200, { walletBalance: user.walletBalance });
});

export const deposit = asyncHandler(async (req: Request, res: Response) => {
  const { amount, method, referenceId } = req.body;
  const transaction = await walletService.requestDeposit(req.user!.id, amount, method, referenceId);
  sendSuccess(res, 201, { transaction }, "Deposit request submitted — awaiting admin approval");
});

export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  const { amount, method } = req.body;
  const transaction = await walletService.requestWithdrawal(req.user!.id, amount, method);
  sendSuccess(res, 201, { transaction }, "Withdrawal request submitted — awaiting admin approval");
});

export const myTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { items, total } = await walletService.listMyTransactions(req.user!.id, skip, limit);
  sendPaginated(res, items, buildMeta(page, limit, total));
});
