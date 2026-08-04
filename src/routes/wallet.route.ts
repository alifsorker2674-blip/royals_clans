import { Router } from "express";
import { getBalance, deposit, withdraw, myTransactions } from "../controllers/wallet.controller";
import { protect } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { depositSchema, withdrawSchema } from "../validators/wallet.validator";

const router = Router();

router.use(protect);

/**
 * @openapi
 * /wallet/balance:
 *   get:
 *     tags: [Wallet]
 *     summary: Get the current user's wallet balance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.get("/balance", getBalance);

/**
 * @openapi
 * /wallet/deposit:
 *   post:
 *     tags: [Wallet]
 *     summary: Submit a manual bKash/Nagad deposit for admin review
 *     description: Creates a pending transaction. Wallet balance is only credited once an admin approves it.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method, referenceId]
 *             properties:
 *               amount: { type: number, example: 200 }
 *               method: { type: string, enum: [bKash, Nagad] }
 *               referenceId: { type: string, example: "8N7A2K9X1Z" }
 *     responses:
 *       201:
 *         description: Deposit request submitted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.post("/deposit", validateBody(depositSchema), deposit);

/**
 * @openapi
 * /wallet/withdraw:
 *   post:
 *     tags: [Wallet]
 *     summary: Request a withdrawal from the wallet
 *     description: Creates a pending transaction. Balance is only deducted once an admin approves it.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method]
 *             properties:
 *               amount: { type: number, example: 150 }
 *               method: { type: string, enum: [bKash, Nagad] }
 *     responses:
 *       201:
 *         description: Withdrawal request submitted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.post("/withdraw", validateBody(withdrawSchema), withdraw);

/**
 * @openapi
 * /wallet/transactions:
 *   get:
 *     tags: [Wallet]
 *     summary: List the current user's transaction history
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
 *         description: Paginated transaction list
 */
router.get("/transactions", myTransactions);

export default router;
