import { Router } from "express";
import { getMyDashboard } from "../controllers/dashboard.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get the current player's dashboard summary
 *     description: Wallet balance, 5 most recent transactions, and tournament participation counts.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player dashboard summary
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.get("/", protect, getMyDashboard);

export default router;
