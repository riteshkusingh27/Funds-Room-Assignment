import type { Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { formatZodErrors } from "../utils/validation";
import {
  customerCreateSchema,
  customerFollowupSchema,
  customerIdSchema,
  customerListQuerySchema,
  customerUpdateSchema
} from "../validators/customerValidators";
import {
  createCustomerService,
  createCustomerFollowupService,
  getCustomerService,
  listCustomerFollowupService,
  listCustomerService,
  updateCustomerService
} from "../services/customerService";

function throwValidationError(message: string, errors: Record<string, string>): never {
  throw new ApiError(400, message, errors);
}

function parseCustomerId(params: Request["params"]): number {
  const parsed = customerIdSchema.safeParse({ customerId: params.customerId });
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  return parsed.data.customerId;
}

function parseCurrentUserId(req: Request): number {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  return req.user.id;
}

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const parsed = customerListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const result = await listCustomerService(parsed.data);

  res.status(200).json({
    success: true,
    data: result
  });
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const customerId = parseCustomerId(req.params);
  const customer = await getCustomerService(customerId);

  res.status(200).json({
    success: true,
    data: customer
  });
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const parsed = customerCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const customer = await createCustomerService(parsed.data, parseCurrentUserId(req));

  res.status(201).json({
    success: true,
    data: customer
  });
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const customerId = parseCustomerId(req.params);
  const parsed = customerUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const customer = await updateCustomerService(customerId, parsed.data);

  res.status(200).json({
    success: true,
    data: customer
  });
}

export async function listCustomerFollowups(req: Request, res: Response): Promise<void> {
  const customerId = parseCustomerId(req.params);
  const followups = await listCustomerFollowupService(customerId);

  res.status(200).json({
    success: true,
    data: followups
  });
}

export async function createCustomerFollowup(req: Request, res: Response): Promise<void> {
  const customerId = parseCustomerId(req.params);
  const parsed = customerFollowupSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const followup = await createCustomerFollowupService(customerId, parsed.data, parseCurrentUserId(req));

  res.status(201).json({
    success: true,
    data: followup
  });
}
