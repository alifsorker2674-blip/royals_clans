import { Router } from "express";
import { getVapidPublicKey, subscribe, unsubscribe } from "../controllers/push.controller";
import { protect } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { subscribeSchema, unsubscribeSchema } from "../validators/push.validator";

const router = Router();

/**
 * @openapi
 * /push/vapid-public-key:
 *   get:
 *     tags: [Push]
 *     summary: Get the VAPID public key needed to create a push subscription
 *     responses:
 *       200:
 *         description: Public key (empty string if push isn't configured on this server yet)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.get("/vapid-public-key", getVapidPublicKey);

/**
 * @openapi
 * /push/subscribe:
 *   post:
 *     tags: [Push]
 *     summary: Register a browser push subscription for the current user
 *     description: Call after `PushManager.subscribe()` in the service worker — sends the resulting subscription object here.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint, keys]
 *             properties:
 *               endpoint: { type: string }
 *               keys:
 *                 type: object
 *                 properties:
 *                   p256dh: { type: string }
 *                   auth: { type: string }
 *     responses:
 *       200:
 *         description: Subscribed
 */
router.post("/subscribe", protect, validateBody(subscribeSchema), subscribe);

/**
 * @openapi
 * /push/unsubscribe:
 *   post:
 *     tags: [Push]
 *     summary: Remove a push subscription for the current user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint]
 *             properties:
 *               endpoint: { type: string }
 *     responses:
 *       200:
 *         description: Unsubscribed
 */
router.post("/unsubscribe", protect, validateBody(unsubscribeSchema), unsubscribe);

export default router;
