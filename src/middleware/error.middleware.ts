import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { AppError } from "../utils/AppError";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File too large — the limit is 5 MB" : err.message;
    res.status(400).json({ success: false, message });
    return;
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
    res.status(409).json({ success: false, message: "Duplicate value — this record already exists" });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
}
