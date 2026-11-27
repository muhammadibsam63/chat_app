import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export type Meta = Record<string, unknown>;

export function ok<T>(res: Response, data: T, meta?: Meta, status = 200): Response {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function fail(res: Response, status: number, message: string, details?: unknown): Response {
  return res.status(status).json({ success: false, error: { message, status, ...(details ? { details } : {}) } });
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function parsePagination(req: Request, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? defaults.page), 10) || defaults.page);
  const rawLimit = Number.parseInt(String(req.query.limit ?? defaults.limit), 10) || defaults.limit;
  const limit = Math.min(Math.max(1, rawLimit), defaults.maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

export function pagingMeta(page: number, limit: number, total: number): Meta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (raw?.split(',')[0] ?? req.ip ?? 'unknown').trim().slice(0, 64);
}

export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}
