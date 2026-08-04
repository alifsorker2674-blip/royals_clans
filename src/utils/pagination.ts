import { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function getPagination(req: Request): PaginationParams {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildMeta(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}
