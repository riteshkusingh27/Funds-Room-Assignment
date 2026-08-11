import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/domain";
import { ApiError } from "../utils/apiError";

export function authorize(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, "You are not allowed to perform this action"));
      return;
    }

    next();
  };
}
