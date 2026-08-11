import type { Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { formatZodErrors } from "../utils/validation";
import {
  productCreateSchema,
  productIdSchema,
  productListQuerySchema,
  productUpdateSchema
} from "../validators/productValidators";
import {
  stockMovementCreateSchema,
  stockMovementListQuerySchema
} from "../validators/stockMovementValidators";
import {
  createProductService,
  createStockMovementService,
  getProductService,
  listProductMovementsService,
  listProductService,
  updateProductService
} from "../services/productService";
import { uploadProductImageToR2 } from "../services/r2Service";

function throwValidationError(message: string, errors: Record<string, string>): never {
  throw new ApiError(400, message, errors);
}

function parseProductId(params: Request["params"]): number {
  const parsed = productIdSchema.safeParse({ productId: params.productId });
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  return parsed.data.productId;
}

function parseCurrentUserId(req: Request): number {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  return req.user.id;
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const parsed = productListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const result = await listProductService(parsed.data);

  res.status(200).json({
    success: true,
    data: result
  });
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const productId = parseProductId(req.params);
  const product = await getProductService(productId);

  res.status(200).json({
    success: true,
    data: product
  });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const product = await createProductService(parsed.data, parseCurrentUserId(req));

  res.status(201).json({
    success: true,
    data: product
  });
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const productId = parseProductId(req.params);
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const product = await updateProductService(productId, parsed.data);

  res.status(200).json({
    success: true,
    data: product
  });
}

export async function createStockMovement(req: Request, res: Response): Promise<void> {
  const parsed = stockMovementCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const movement = await createStockMovementService(parsed.data, parseCurrentUserId(req));

  res.status(201).json({
    success: true,
    data: movement
  });
}

export async function listProductMovements(req: Request, res: Response): Promise<void> {
  const productId = parseProductId(req.params);
  const parsed = stockMovementListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throwValidationError("Validation failed", formatZodErrors(parsed.error));
  }

  const result = await listProductMovementsService(productId, parsed.data);

  res.status(200).json({
    success: true,
    data: result
  });
}

export async function uploadProductImage(req: Request, res: Response): Promise<void> {
  const { fileName, fileType, base64Data } = req.body ?? {};

  if (!fileName || !base64Data) {
    throw new ApiError(400, "fileName and base64Data are required for image upload");
  }

  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const fileBuffer = Buffer.from(base64Clean, "base64");

  const imageUrl = await uploadProductImageToR2(fileBuffer, fileName, fileType || "image/jpeg");

  res.status(200).json({
    success: true,
    data: { imageUrl }
  });
}

