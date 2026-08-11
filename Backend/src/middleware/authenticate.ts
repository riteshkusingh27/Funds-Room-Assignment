import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtPayload } from "../types/auth";
import { ApiError } from "../utils/apiError";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new ApiError(401, "Authentication required"));
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}
