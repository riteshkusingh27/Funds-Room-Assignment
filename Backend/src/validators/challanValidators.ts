import { z } from "zod";
import { CHALLAN_STATUSES } from "../types/domain";

export const challanIdSchema = z.object({
  challanId: z.coerce.number().int().positive()
});

export const challanListQuerySchema = z.object({
  search: z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional()),
  status: z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.enum(CHALLAN_STATUSES).optional()),
  customerId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

const challanItemSchema = z.object({
  productId: z.coerce.number().int().positive("Product ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0")
});

export const challanCreateSchema = z.object({
  customerId: z.coerce.number().int().positive("Customer ID is required"),
  items: z.array(challanItemSchema).min(1, "At least one item is required")
});

export const challanUpdateSchema = z.object({
  items: z.array(challanItemSchema).min(1, "At least one item is required")
});

export type ChallanCreateInput = z.infer<typeof challanCreateSchema>;
export type ChallanUpdateInput = z.infer<typeof challanUpdateSchema>;
export type ChallanItemInput = z.infer<typeof challanItemSchema>;
export type ChallanListQuery = z.infer<typeof challanListQuerySchema>;
