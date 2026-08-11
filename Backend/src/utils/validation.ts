import type { ZodError } from "zod";

export function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".") || "body";
    errors[field] = issue.message;
  }

  return errors;
}
