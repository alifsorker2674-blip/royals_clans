import { Router } from "express";
import { getLeaderboard, myRankings, clanLeaderboard } from "../controllers/leaderboard.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /leaderboard:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Global / game-wise / weekly / monthly leaderboard
 *     description: >
 *       `period=all` ranks by cumulative career points (and shows each player's tier);
 *       `weekly`/`monthly` rank by points earned inside that window only.
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [all, weekly, monthly], default: all }
 *       - in: query
 *         name: game
 *         schema: { type: string, enum: [freefire, bloodstrike] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated leaderboard
 */
router.get("/", getLeaderboard);

/**
 * @openapi
 * /leaderboard/me:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Your own ranking (points, tier, wins/losses) per game
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Your rankings
 */
router.get("/me", protect, myRankings);

/**
 * @openapi
 * /leaderboard/clans:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Clan leaderboard — clans ranked by their members' combined career points
 *     parameters:
 *       - in: query
 *         name: game
 *         schema: { type: string, enum: [freefire, bloodstrike] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated clan leaderboard
 */
router.get("/clans", clanLeaderboard);

export default router;
