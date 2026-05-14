import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = (err as { status?: number }).status ?? 500;

  if (status >= 500) {
    logger.error({ err: message, url: req.url, method: req.method }, "Unhandled server error");
  }

  // Never leak stack traces or raw error details in production
  return res.status(status).json({
    error: status >= 500 && process.env["NODE_ENV"] === "production"
      ? "An unexpected error occurred"
      : message,
  });
}
