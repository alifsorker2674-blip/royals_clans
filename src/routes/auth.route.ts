import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { protect } from "../middleware/auth.middleware";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/auth.validator";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterInput:
 *       type: object
 *       required: [name, email, password]
 *       properties:
 *         name: { type: string, example: "Kaif Islam" }
 *         email: { type: string, example: "kaif@example.com" }
 *         phone: { type: string, example: "01700000000" }
 *         password: { type: string, example: "secret123" }
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, example: "kaif@example.com" }
 *         password: { type: string, example: "secret123" }
 *     PublicUser:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         email: { type: string }
 *         phone: { type: string }
 *         role: { type: string, enum: [user, admin] }
 *         walletBalance: { type: number }
 *         createdAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new player account
 *     description: Registers a new user and returns an access token. A refresh token is set as an httpOnly cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterInput' }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post("/register", validateBody(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginInput' }
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post("/login", validateBody(loginSchema), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange the refresh-token cookie for a new access token
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 *       401:
 *         description: Missing, invalid, or expired refresh token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post("/refresh", refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Clear the refresh-token cookie
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.post("/logout", logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get("/me", protect, me);

/**
 * @openapi
 * /auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Update the current user's own profile (name/phone)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Kaif Islam" }
 *               phone: { type: string, example: "01700000000" }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.patch("/me", protect, validateBody(updateProfileSchema), updateMe);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the current user's password (while logged in)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, example: "newSecret123" }
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post("/change-password", protect, validateBody(changePasswordSchema), changePassword);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset
 *     description: >
 *       Always returns success (even for an unknown email) to avoid leaking which emails are
 *       registered. **MVP note:** no email service is configured yet (see architecture.md), so
 *       when the account exists, the raw reset token is returned directly in the response instead
 *       of being emailed — this must be replaced with real email delivery before production launch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "kaif@example.com" }
 *     responses:
 *       200:
 *         description: Reset requested (token included in the response body for now — see MVP note above)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiSuccess' }
 */
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset a password using a token from /auth/forgot-password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, example: "newSecret123" }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);

export default router;
