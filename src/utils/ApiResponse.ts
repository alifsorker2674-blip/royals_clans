import { Response } from "express";

export function sendSuccess<T>(res: Response, statusCode: number, data: T, message?: string): void {
  res.status(statusCode).json({ success: true, data, message });
}

export function sendPaginated<T>(
  res: Response,
  data: T,
  meta: { page: number; limit: number; total: number; pages: number }
): void {
  res.status(200).json({ success: true, data, meta });
}
