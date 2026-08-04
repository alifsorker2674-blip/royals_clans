import { Router, Request, Response } from "express";
import { protect } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getOrganizerSummary } from "../services/organizer.service";

const router = Router();

/**
 * @openapi
 * /organizer/summary:
 *   get:
 *     tags: [Organizer]
 *     summary: Organizer dashboard — stats for every tournament the current user hosts
 *     description: Totals (tournaments by status, participants, entry-fee pool, create fees paid) plus a per-tournament breakdown.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organizer summary
 */
router.get(
  "/summary",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const summary = await getOrganizerSummary(req.user!.id);
    sendSuccess(res, 200, summary);
  })
);

export default router;
