import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(maxLength).optional());

export const productIdSchema = z.object({
  productId: z.coerce.number().int().positive()
});

export const productListQuerySchema = z.object({
  search: z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional()),
  category: optionalTrimmedString(100),
  lowStock: z.preprocess((value) => {
    if (value === "true" || value === "1") {
      return true;
    }
    return undefined;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  sku: z.string().trim().min(1, "SKU is required").max(100),
  category: z.string().trim().min(1, "Category is required").max(100),
  unitPrice: z.coerce.number().nonnegative("Unit price must be >= 0"),
  currentStock: z.coerce.number().int().nonnegative("Current stock must be >= 0"),
  minimumStock: z.coerce.number().int().nonnegative("Minimum stock must be >= 0"),
  warehouseLocation: z.string().trim().min(1, "Warehouse location is required").max(500),
  imageUrl: z.string().trim().optional().nullable()
});

export const productUpdateSchema = productCreateSchema.partial().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "At least one field is required"
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
