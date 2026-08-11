import type { Request, Response } from "express";
import { login as loginService } from "../services/authService";
import { loginSchema } from "../validators/authValidators";
import { ApiError } from "../utils/apiError";

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }
  return req.ip;
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "body";
      errors[field] = issue.message;
    }
    throw new ApiError(400, "Validation failed", errors);
  }

  const userAgentHeader = req.headers["user-agent"];

  const result = await loginService(parsed.data, {
    ipAddress: getClientIp(req),
    userAgent: typeof userAgentHeader === "string" ? userAgentHeader : undefined
  });

  res.status(200).json({
    success: true,
    data: result
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  res.status(200).json({
    success: true,
    data: req.user
  });
}

export async function roleCheck(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: {
      message: "Role access granted"
    }
  });
}
