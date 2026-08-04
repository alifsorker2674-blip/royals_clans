import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../services/token.service";
import { UserRole } from "../models/user.model";

export function protect(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Authentication required");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(401, "Invalid or expired access token");
  }
}

/**
 * Attaches `req.user` when a valid token is present, but never rejects the request.
 * For public routes whose *response* varies by who's asking — e.g. tournament details,
 * where room credentials are only included for registered participants.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // Ignore a bad/expired token here — the caller is simply treated as a guest.
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
    next();
  };
}
