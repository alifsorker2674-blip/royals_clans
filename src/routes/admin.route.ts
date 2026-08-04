import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { rejectTransactionSchema } from "../validators/wallet.validator";
import { rejectTournamentSchema, createTournamentSchema } from "../validators/tournament.validator";
import { updateFeeConfigSchema } from "../validators/feeConfig.validator";
import { changeRoleSchema } from "../validators/user.validator";
import { resolveDisputeSchema, payoutSchema } from "../validators/match.validator";
import { createRoomSchema, updateRoomSchema } from "../validators/roomCredential.validator";
import { resolveQuickMatchSchema } from "../validators/quickMatch.validator";
import { updateSiteSettingsSchema } from "../validators/siteSettings.validator";
import { getAdminOverview } from "../controllers/dashboard.controller";
import * as admin from "../controllers/admin.controller";

const router = Router();

router.use(protect, requireRole("admin"));

/**
 * @openapi
 * /admin/overview:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard overview stats
 *     description: User counts, pending-approval counts (deposits/withdrawals/tournaments), tournament counts.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview stats
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.get("/overview", getAdminOverview);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [user, admin] }
 *       - in: query
 *         name: isBanned
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against name or email
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get("/users", admin.listUsers);

/**
 * @openapi
 * /admin/users/{id}/ban:
 *   post:
 *     tags: [Admin]
 *     summary: Ban a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User banned
 */
router.post("/users/:id/ban", admin.banUser);

/**
 * @openapi
 * /admin/users/{id}/unban:
 *   post:
 *     tags: [Admin]
 *     summary: Unban a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User unbanned
 */
router.post("/users/:id/unban", admin.unbanUser);

/**
 * @openapi
 * /admin/users/{id}/role:
 *   put:
 *     tags: [Admin]
 *     summary: Change a user's role
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [user, admin] }
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put("/users/:id/role", validateBody(changeRoleSchema), admin.changeUserRole);

/**
 * @openapi
 * /admin/transactions:
 *   get:
 *     tags: [Admin]
 *     summary: List pending deposit/withdrawal requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [deposit, withdrawal] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated pending transactions
 */
router.get("/transactions", admin.listPendingTransactions);

/**
 * @openapi
 * /admin/transactions/{id}/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve a pending deposit or withdrawal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction approved and wallet balance updated
 */
router.post("/transactions/:id/approve", admin.approveTransaction);

/**
 * @openapi
 * /admin/transactions/{id}/reject:
 *   post:
 *     tags: [Admin]
 *     summary: Reject a pending deposit or withdrawal
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Transaction rejected
 */
router.post("/transactions/:id/reject", validateBody(rejectTransactionSchema), admin.rejectTransaction);

/**
 * @openapi
 * /admin/tournaments:
 *   get:
 *     tags: [Admin]
 *     summary: List tournaments for review (any status)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, live, completed, cancelled] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated tournament list
 */
router.get("/tournaments", admin.listTournaments);

/**
 * @openapi
 * /admin/tournaments:
 *   post:
 *     tags: [Admin]
 *     summary: Create an official platform-hosted tournament
 *     description: >
 *       Publishes immediately (status `approved`, `isOfficial: true`) with no create fee —
 *       the platform is both organizer and approver. Room ID/password are required, same as
 *       any other tournament.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTournamentInput' }
 *     responses:
 *       201:
 *         description: Official tournament created and live
 */
router.post("/tournaments", validateBody(createTournamentSchema), admin.createOfficialTournament);

/**
 * @openapi
 * /admin/tournaments/{id}/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve a pending tournament (publishes it to the Marketplace)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tournament approved
 */
router.post("/tournaments/:id/approve", admin.approveTournament);

/**
 * @openapi
 * /admin/tournaments/{id}/reject:
 *   post:
 *     tags: [Admin]
 *     summary: Reject a pending tournament (refunds the organizer's create fee)
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Tournament rejected and create fee refunded
 */
router.post("/tournaments/:id/reject", validateBody(rejectTournamentSchema), admin.rejectTournament);

/**
 * @openapi
 * /admin/fee-config:
 *   put:
 *     tags: [Admin]
 *     summary: Update platform fee settings (tournament create-fee table, service fee %s)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tournamentCreateFeeTable:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     slots: { type: integer }
 *                     fee: { type: number }
 *               tournamentEntryServiceFeePct: { type: number }
 *               quickMatchServiceFeePct: { type: number }
 *               withdrawalChargePct: { type: number }
 *     responses:
 *       200:
 *         description: Fee configuration updated
 */
router.put("/fee-config", validateBody(updateFeeConfigSchema), admin.updateFeeConfig);

/**
 * @openapi
 * /admin/disputes:
 *   get:
 *     tags: [Admin]
 *     summary: List open (under-review) match disputes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated open disputes, each with its match (submissions) and tournament populated
 */
router.get("/disputes", admin.listDisputes);

/**
 * @openapi
 * /admin/disputes/{id}/resolve:
 *   post:
 *     tags: [Admin]
 *     summary: Resolve an open dispute by deciding the final winner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Dispute id (not match id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [finalWinner, resolution]
 *             properties:
 *               finalWinner: { type: string, description: "User id of the decided winner" }
 *               resolution: { type: string, example: "Screenshot from player A clearly shows the final kill feed" }
 *     responses:
 *       200:
 *         description: Dispute resolved, match marked admin_resolved
 */
router.post("/disputes/:id/resolve", validateBody(resolveDisputeSchema), admin.resolveDispute);

/**
 * @openapi
 * /admin/matches/{matchId}/payout:
 *   post:
 *     tags: [Admin]
 *     summary: Pay out prize money to a user for a finalized match
 *     description: Amount is set explicitly by the admin per the tournament's prize distribution — credited to the recipient's wallet immediately.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount]
 *             properties:
 *               userId: { type: string }
 *               amount: { type: number, example: 2500 }
 *     responses:
 *       200:
 *         description: Prize credited to the user's wallet
 *       400:
 *         description: Match result is not finalized yet
 */
router.post("/matches/:matchId/payout", validateBody(payoutSchema), admin.payoutPrize);

/**
 * @openapi
 * /admin/rooms:
 *   get:
 *     tags: [Admin]
 *     summary: List the Quick Match room-credential pool
 *     security:
 *       - bearerAuth: []
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
 *         description: Paginated room pool (each entry shows lastAssignedAt / timesAssigned)
 *   post:
 *     tags: [Admin]
 *     summary: Add a room to the Quick Match pool
 *     description: >
 *       Pre-created in-game lobbies that Quick Match hands out automatically, so nobody has to
 *       sit and create a room per match. Each room is only reused after the cooldown expires.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [game, roomId, roomPassword]
 *             properties:
 *               game: { type: string, enum: [freefire, bloodstrike] }
 *               roomId: { type: string }
 *               roomPassword: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Room added to the pool
 */
router.get("/rooms", admin.listRooms);
router.post("/rooms", validateBody(createRoomSchema), admin.createRoom);

/**
 * @openapi
 * /admin/rooms/availability:
 *   get:
 *     tags: [Admin]
 *     summary: How many pool rooms are free vs. cooling down right now
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Availability counts and the configured cooldown
 */
router.get("/rooms/availability", admin.roomAvailability);

/**
 * @openapi
 * /admin/rooms/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a pooled room (credentials, note, or active flag)
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
 *             properties:
 *               game: { type: string, enum: [freefire, bloodstrike] }
 *               roomId: { type: string }
 *               roomPassword: { type: string }
 *               note: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Room updated
 *   delete:
 *     tags: [Admin]
 *     summary: Remove a room from the pool
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room deleted
 */
router.put("/rooms/:id", validateBody(updateRoomSchema), admin.updateRoom);
router.delete("/rooms/:id", admin.deleteRoom);

/**
 * @openapi
 * /admin/quick-matches:
 *   get:
 *     tags: [Admin]
 *     summary: Monitor Quick Matches
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, awaiting_results, confirmed, under_review, resolved, cancelled] }
 *     responses:
 *       200:
 *         description: Paginated Quick Match list
 */
router.get("/quick-matches", admin.listQuickMatches);

/**
 * @openapi
 * /admin/quick-matches/queue-stats:
 *   get:
 *     tags: [Admin]
 *     summary: Who's waiting in the Quick Match queue, by game and entry fee
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue breakdown and active-match count
 */
router.get("/quick-matches/queue-stats", admin.quickMatchQueueStats);

/**
 * @openapi
 * /admin/quick-matches/{id}/resolve:
 *   post:
 *     tags: [Admin]
 *     summary: Decide a disputed Quick Match (pays the winner immediately)
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
 *             required: [winnerId, resolution]
 *             properties:
 *               winnerId: { type: string }
 *               resolution: { type: string }
 *     responses:
 *       200:
 *         description: Resolved, prize paid, ranking points awarded
 */
router.post("/quick-matches/:id/resolve", validateBody(resolveQuickMatchSchema), admin.resolveQuickMatch);

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: Platform reports — revenue, money flow by type, user growth, statuses, disputes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report figures
 */
router.get("/reports", admin.getReports);

/**
 * @openapi
 * /admin/settings:
 *   put:
 *     tags: [Admin]
 *     summary: Update site content (announcement bar, home banner image URL)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               announcement: { type: string, example: "Weekend mega tournament — ৳10,000 prize pool!" }
 *               bannerUrl: { type: string }
 *     responses:
 *       200:
 *         description: Site content updated
 */
router.put("/settings", validateBody(updateSiteSettingsSchema), admin.updateSiteSettings);

export default router;
