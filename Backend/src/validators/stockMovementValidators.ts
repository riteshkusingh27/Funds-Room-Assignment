import { z } from "zod";
import { MOVEMENT_TYPES } from "../types/domain";

export const stockMovementCreateSchema = z.object({
  productId: z.coerce.number().int().positive("Product ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  movementType: z.enum(MOVEMENT_TYPES),
  reason: z.string().trim().min(1, "Reason is required").max(500)
});

export const stockMovementListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export type StockMovementCreateInput = z.infer<typeof stockMovementCreateSchema>;
export type StockMovementListQuery = z.infer<typeof stockMovementListQuerySchema>;
