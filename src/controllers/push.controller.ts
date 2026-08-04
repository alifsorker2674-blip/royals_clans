import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { env } from "../config/env";
import { PushSubscription } from "../models/pushSubscription.model";

export const getVapidPublicKey = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, 200, { publicKey: env.vapid.publicKey });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const { endpoint, keys } = req.body;
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userId: req.user!.id, endpoint, keys },
    { upsert: true, new: true }
  );
  sendSuccess(res, 200, null, "Subscribed to push notifications");
});

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  await PushSubscription.deleteOne({ endpoint: req.body.endpoint, userId: req.user!.id });
  sendSuccess(res, 200, null, "Unsubscribed from push notifications");
});
