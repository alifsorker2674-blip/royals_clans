import { Router } from "express";
import {
  create,
  list,
  getById,
  join,
  registrations,
  updateRoomCredentials,
} from "../controllers/tournament.controller";
import { create as createMatch, listForTournament as listMatches } from "../controllers/match.controller";
import { protect, optionalAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createTournamentSchema, updateRoomCredentialsSchema } from "../validators/tournament.validator";
import { createMatchSchema } from "../validators/match.validator";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateTournamentInput:
 *       type: object
 *       required: [title, game, mode, entryFee, slots, prizePool]
 *       properties:
 *         title: { type: string, example: "Free Fire Solo Showdown" }
 *         game: { type: string, enum: [freefire, bloodstrike] }
 *         mode: { type: string, enum: [solo, duo, squad] }
 *         entryFee: { type: number, example: 50 }
 *         slots: { type: integer, example: 100 }
 *         prizePool: { type: number, example: 4200 }
 *         prizeDistribution: { type: string, example: "1st: 2500, 2nd: 1200, 3rd: 500" }
 *         rules: { type: string }
 *         schedule: { type: string, format: date-time }
 */

/**
 * @openapi
 * /tournaments:
 *   get:
 *     tags: [Tournaments]
 *     summary: Browse the Tournament Marketplace
 *     description: Publicly lists approved/live/completed tournaments. No auth required.
 *     parameters:
 *       - in: query
 *         name: game
 *         schema: { type: string, enum: [freefire, bloodstrike] }
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [solo, duo, squad] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated tournament list
 *   post:
 *     tags: [Tournaments]
 *     summary: Create a tournament (any authenticated user can be an organizer)
 *     description: >
 *       Debits the tournament create fee from the organizer's wallet immediately (amount depends on
 *       `slots`, see GET /fee-config), then creates the tournament with status "pending" until an
 *       admin approves it and it becomes publicly visible.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTournamentInput' }
 *     responses:
 *       201:
 *         description: Tournament submitted for admin review
 *       400:
 *         description: Insufficient wallet balance for the create fee, or invalid input
 */
router.get("/", list);
router.post("/", protect, validateBody(createTournamentSchema), create);

/**
 * @openapi
 * /tournaments/{id}:
 *   get:
 *     tags: [Tournaments]
 *     summary: Get tournament details
 *     description: >
 *       Public, but the response varies by caller: `roomId`/`roomPassword` are only included
 *       for registered participants, the organizer, and admins. Send a bearer token to get them.
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tournament details (room credentials included only if you're entitled to them)
 *       404:
 *         description: Not found
 */
router.get("/:id", optionalAuth, getById);

/**
 * @openapi
 * /tournaments/{id}/room:
 *   put:
 *     tags: [Tournaments]
 *     summary: Update a tournament's lobby credentials (organizer or admin only)
 *     description: Room IDs are often only known shortly before match time, so they can be changed after creation.
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
 *             required: [roomId, roomPassword]
 *             properties:
 *               roomId: { type: string }
 *               roomPassword: { type: string }
 *     responses:
 *       200:
 *         description: Room credentials updated
 *       403:
 *         description: Not the organizer or an admin
 */
router.put("/:id/room", protect, validateBody(updateRoomCredentialsSchema), updateRoomCredentials);

/**
 * @openapi
 * /tournaments/{id}/join:
 *   post:
 *     tags: [Tournaments]
 *     summary: Join a tournament
 *     description: Debits the entry fee from the player's wallet immediately and registers them.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Joined
 *       400:
 *         description: Tournament not open, full, or insufficient balance
 *       409:
 *         description: Already registered
 */
router.post("/:id/join", protect, join);

/**
 * @openapi
 * /tournaments/{id}/registrations:
 *   get:
 *     tags: [Tournaments]
 *     summary: View a tournament's participant list (organizer or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Participant list
 *       403:
 *         description: Not the organizer or an admin
 */
router.get("/:id/registrations", protect, registrations);

/**
 * @openapi
 * /tournaments/{tournamentId}/matches:
 *   get:
 *     tags: [Matches]
 *     summary: List matches for a tournament
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated match list
 *   post:
 *     tags: [Matches]
 *     summary: Create a match for this tournament (organizer or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               round: { type: string, example: "Final" }
 *     responses:
 *       201:
 *         description: Match created
 *       403:
 *         description: Not the organizer or an admin
 */
router.get("/:tournamentId/matches", listMatches);
router.post("/:tournamentId/matches", protect, validateBody(createMatchSchema), createMatch);

export default router;
