import { Router } from "express";
import { getById, submitResult } from "../controllers/match.controller";
import { protect } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { submitResultSchema } from "../validators/match.validator";

const router = Router();

/**
 * @openapi
 * /matches/{id}:
 *   get:
 *     tags: [Matches]
 *     summary: Get a match's current state (submissions so far, status, final winner if decided)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Match details
 *       404:
 *         description: Not found
 */
router.get("/:id", getById);

/**
 * @openapi
 * /matches/{id}/submit-result:
 *   post:
 *     tags: [Matches]
 *     summary: Submit a result screenshot and your claim of the winner
 *     description: >
 *       Dual-confirmation flow: once 2 submissions exist, if they agree on the same winner the
 *       match auto-confirms; if they disagree the match flips to "under_review" and an admin
 *       dispute is opened. Only a registered participant or the tournament's organizer may submit.
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
 *               selectedWinner: { type: string, description: "User id of who this submitter says won" }
 *     responses:
 *       200:
 *         description: Submission recorded (result may now be confirmed, under review, or still awaiting another submission)
 *       400:
 *         description: Match already finalized
 *       403:
 *         description: Not a registered participant or the organizer
 */
router.post("/:id/submit-result", protect, validateBody(submitResultSchema), submitResult);

export default router;
