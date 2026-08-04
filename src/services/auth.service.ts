import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User, IUser } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { RegisterInput, LoginInput, UpdateProfileInput } from "../validators/auth.validator";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "./token.service";

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toPublicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    walletBalance: user.walletBalance,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
  });

  const accessToken = generateAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = generateRefreshToken({ sub: user._id.toString(), role: user.role });

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }
  if (user.isBanned) {
    throw new AppError(403, "This account has been banned");
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, "Invalid email or password");
  }

  const accessToken = generateAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = generateRefreshToken({ sub: user._id.toString(), role: user.role });

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user || user.isBanned) {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const accessToken = generateAccessToken({ sub: user._id.toString(), role: user.role });
  return { accessToken, user: toPublicUser(user) };
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return toPublicUser(user);
}

export async function updateProfile(userId: string, updates: UpdateProfileInput) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError(404, "User not found");
  return toPublicUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new AppError(404, "User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new AppError(401, "Current password is incorrect");

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

/**
 * Generates a one-time reset token (only its SHA-256 hash is stored, 1h expiry).
 * MVP NOTE: no email/SMS service is configured yet (see architecture.md), so the raw
 * token is returned directly to the caller instead of being emailed — the controller
 * marks this clearly as dev-only. Replace with real delivery before production launch.
 * Always resolves successfully (even for an unknown email) to avoid leaking which
 * emails are registered; the raw token is simply omitted when there's no such account.
 */
export async function requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
  const user = await User.findOne({ email });
  if (!user) return {};

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordTokenHash = hashResetToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  return { resetToken: rawToken };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashResetToken(rawToken);
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +resetPasswordExpires");

  if (!user) throw new AppError(400, "Invalid or expired reset token");

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
}
