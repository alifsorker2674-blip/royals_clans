import { Router } from "express";
import { create, list, myClan, getById, join, leave, kick, remove } from "../controllers/clan.controller";
import { protect } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createClanSchema, kickMemberSchema } from "../validators/clan.validator";

const router = Router();

/**
 * @openapi
 * /clans:
 *   get:
 *     tags: [Clans]
 *     summary: Browse/search clans
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches clan name or tag
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated clan list
 *   post:
 *     tags: [Clans]
 *     summary: Create a clan (creator becomes owner; one clan per player)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tag]
 *             properties:
 *               name: { type: string, example: "Royal Reapers" }
 *               tag: { type: string, example: "RRPS" }
 *               logoUrl: { type: string }
 *     responses:
 *       201:
 *         description: Clan created
 *       409:
 *         description: Already in a clan, or clan name taken
 */
router.get("/", list);
router.post("/", protect, validateBody(createClanSchema), create);

/**
 * @openapi
 * /clans/me:
 *   get:
 *     tags: [Clans]
 *     summary: Get the clan the current user belongs to (null if none)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Your clan or null
 */
router.get("/me", protect, myClan);

/**
 * @openapi
 * /clans/{id}:
 *   get:
 *     tags: [Clans]
 *     summary: Clan details with per-member ranking stats
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Clan detail
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Clans]
 *     summary: Delete a clan (owner or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.get("/:id", getById);
router.delete("/:id", protect, remove);

/**
 * @openapi
 * /clans/{id}/join:
 *   post:
 *     tags: [Clans]
 *     summary: Join a clan (only if you're not in one already)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Joined
 *       409:
 *         description: Already in a clan
 */
router.post("/:id/join", protect, join);

/**
 * @openapi
 * /clans/{id}/leave:
 *   post:
 *     tags: [Clans]
 *     summary: Leave your clan (owner can only leave when alone — the clan then dissolves)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Left (response says whether the clan was deleted)
 */
router.post("/:id/leave", protect, leave);

/**
 * @openapi
 * /clans/{id}/kick:
 *   post:
 *     tags: [Clans]
 *     summary: Kick a member (clan owner or admin)
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
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200:
 *         description: Member kicked
 */
router.post("/:id/kick", protect, validateBody(kickMemberSchema), kick);

export default router;
