import { Request, Response } from "express";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";
import * as authService from "../services/auth.service";

const REFRESH_COOKIE_NAME = "refreshToken";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: env.jwt.refreshExpiryDays * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.registerUser(req.body);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, 201, { user, accessToken }, "Account created");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, 200, { user, accessToken }, "Logged in");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new AppError(401, "No refresh token provided");
  }
  const { accessToken, user } = await authService.refreshAccessToken(token);
  sendSuccess(res, 200, { user, accessToken });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
  sendSuccess(res, 200, null, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  sendSuccess(res, 200, { user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  sendSuccess(res, 200, { user }, "Profile updated");
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.id, currentPassword, newPassword);
  sendSuccess(res, 200, null, "Password changed");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken } = await authService.requestPasswordReset(req.body.email);
  sendSuccess(
    res,
    200,
    // MVP-only: no email service is configured yet, so the token is returned directly
    // instead of being emailed. Remove `resetToken` from the response once real email
    // delivery (see architecture.md) is wired up.
    resetToken ? { resetToken } : null,
    "If an account with that email exists, a password reset link has been generated."
  );
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  sendSuccess(res, 200, null, "Password reset — you can now log in with your new password");
});
