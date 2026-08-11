import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {})
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}
