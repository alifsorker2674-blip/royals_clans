import { Router } from "express";
import { joinQueue, cancelQueue, myStatus, getById, submitResult } from "../controllers/quickMatch.controller";
import { protect } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { joinQueueSchema, submitQuickMatchResultSchema } from "../validators/quickMatch.validator";

const router = Router();

router.use(protect);

/**
 * @openapi
 * /quick-match/queue:
 *   post:
 *     tags: [Quick Match]
 *     summary: Join the Quick Match queue (pairs instantly if an opponent is waiting)
 *     description: >
 *       Pairs with any player already waiting on the same game + entry fee. On a match, both
 *       players' entry fees are debited, a room is auto-assigned from the admin-managed pool
 *       (respecting the cooldown so no two live matches share a lobby), and both sides get the
 *       room ID + password. Sitting in the queue alone never costs anything.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [game, entryFee]
 *             properties:
 *               game: { type: string, enum: [freefire, bloodstrike] }
 *               entryFee: { type: number, example: 20 }
 *     responses:
 *       201:
 *         description: Matched immediately — response contains the match with room credentials
 *       202:
 *         description: Queued, waiting for an opponent
 *       400:
 *         description: Invalid entry-fee tier or insufficient wallet balance
 *       409:
 *         description: Already queued or already in a match
 *       503:
 *         description: No room in the pool is off cooldown right now
 */
router.post("/queue", validateBody(joinQueueSchema), joinQueue);

/**
 * @openapi
 * /quick-match/queue:
 *   delete:
 *     tags: [Quick Match]
 *     summary: Leave the Quick Match queue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Left the queue
 */
router.delete("/queue", cancelQueue);

/**
 * @openapi
 * /quick-match/status:
 *   get:
 *     tags: [Quick Match]
 *     summary: Poll your current Quick Match state (idle / waiting / matched)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current state, including the active match (with room credentials) when matched
 */
router.get("/status", myStatus);

/**
 * @openapi
 * /quick-match/{id}:
 *   get:
 *     tags: [Quick Match]
 *     summary: Get a Quick Match (players in it, or an admin, only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Match details
 *       403:
 *         description: Not a player in this match
 */
router.get("/:id", getById);

/**
 * @openapi
 * /quick-match/{id}/submit-result:
 *   post:
 *     tags: [Quick Match]
 *     summary: Submit your screenshot and who you say won
 *     description: >
 *       Two agreeing submissions confirm the result and pay the winner instantly. The moment
 *       they disagree the match goes to admin review and nothing is paid out until resolved.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [screenshotUrl, selectedWinner]
 *             properties:
 *               screenshotUrl: { type: string, format: uri }
 *               selectedWinner: { type: string }
 *     responses:
 *       200:
 *         description: Submission recorded (confirmed, under review, or awaiting the opponent)
 */
router.post("/:id/submit-result", validateBody(submitQuickMatchResultSchema), submitResult);

export default router;
