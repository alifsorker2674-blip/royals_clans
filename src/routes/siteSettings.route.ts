import { Router, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getSiteSettings } from "../services/siteSettings.service";

const router = Router();

/**
 * @openapi
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Public site content — announcement bar text and home banner image
 *     responses:
 *       200:
 *         description: Current site settings
 */
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await getSiteSettings();
    sendSuccess(res, 200, { settings: { announcement: settings.announcement, bannerUrl: settings.bannerUrl } });
  })
);

export default router;
