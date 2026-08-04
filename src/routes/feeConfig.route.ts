import { Router } from "express";
import { getFeeConfig } from "../controllers/feeConfig.controller";

const router = Router();

/**
 * @openapi
 * /fee-config:
 *   get:
 *     tags: [Fee Config]
 *     summary: Get current platform fee settings
 *     description: Public — the frontend needs this to preview the tournament create fee before submission.
 *     responses:
 *       200:
 *         description: Fee configuration
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.get("/", getFeeConfig);

export default router;
