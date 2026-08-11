import { z } from "zod";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from "../types/domain";

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(maxLength).optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().email().optional());

const optionalDateString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional());

const mobileSchema = z.string().trim().min(7).max(20).regex(/^[0-9+\-\s()]+$/, "Mobile number can contain only digits, spaces, +, -, and parentheses");

export const customerIdSchema = z.object({
  customerId: z.coerce.number().int().positive()
});

export const customerListQuerySchema = z.object({
  search: z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(200),
  mobile: mobileSchema,
  email: optionalEmail,
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  gstNumber: optionalTrimmedString(20),
  customerType: z.enum(CUSTOMER_TYPES),
  address: z.string().trim().min(1, "Address is required").max(1000),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  followUpDate: optionalDateString,
  notes: optionalTrimmedString(2000)
});

export const customerUpdateSchema = customerCreateSchema.partial().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "At least one field is required"
});

export const customerFollowupSchema = z.object({
  note: z.string().trim().min(1, "Follow-up note is required").max(2000),
  followUpDate: optionalDateString
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerFollowupInput = z.infer<typeof customerFollowupSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
