import type { Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { formatZodErrors } from "../utils/validation";
import {
  challanCreateSchema,
  challanIdSchema,
  challanListQuerySchema,
  challanUpdateSchema
} from "../validators/challanValidators";
import {
  cancelChallanService,
  confirmChallanService,
  createChallanService,
  getChallanService,
  listChallanService,
  updateChallanService
} from "../services/challanService";

function throwValidationError(message: string, errors: Record<string, string>): never {
  throw new ApiError(400, message, errors);
}

function parseChallanId(params: Request["params"]): number {
  const parsed = challanIdSchema.safeParse({ challanId: params.challanId });
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  return parsed.data.challanId;
}

function parseCurrentUserId(req: Request): number {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  return req.user.id;
}

export async function listChallans(req: Request, res: Response): Promise<void> {
  const parsed = challanListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const result = await listChallanService(parsed.data);

  res.status(200).json({
    success: true,
    data: result
  });
}

export async function getChallan(req: Request, res: Response): Promise<void> {
  const challanId = parseChallanId(req.params);
  const challan = await getChallanService(challanId);

  res.status(200).json({
    success: true,
    data: challan
  });
}

export async function createChallan(req: Request, res: Response): Promise<void> {
  const parsed = challanCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const challan = await createChallanService(parsed.data, parseCurrentUserId(req));

  res.status(201).json({
    success: true,
    data: challan
  });
}

export async function updateChallan(req: Request, res: Response): Promise<void> {
  const challanId = parseChallanId(req.params);
  const parsed = challanUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const challan = await updateChallanService(challanId, parsed.data);

  res.status(200).json({
    success: true,
    data: challan
  });
}

export async function confirmChallan(req: Request, res: Response): Promise<void> {
  const challanId = parseChallanId(req.params);
  const challan = await confirmChallanService(challanId, parseCurrentUserId(req));

  res.status(200).json({
    success: true,
    data: challan
  });
}

export async function cancelChallan(req: Request, res: Response): Promise<void> {
  const challanId = parseChallanId(req.params);
  const challan = await cancelChallanService(challanId);

  res.status(200).json({
    success: true,
    data: challan
  });
}
