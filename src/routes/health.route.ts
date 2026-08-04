import { Router } from "express";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check whether the API is up
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
