import { z } from "zod";

export const nonEmptyTextSchema = z.string().trim().min(1);
export const optionalTextSchema = nonEmptyTextSchema.optional();
export const recordIdSchema = nonEmptyTextSchema;
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format.");
export const timeOfDaySchema = z
  .string()
  .regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, "Expected a time in HH:MM format.");
export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Expected an uppercase ISO currency code.");

export const ownerScopeTypes = ["user", "lab"] as const;

export const ownerScopeSchema = z.object({
  type: z.enum(ownerScopeTypes),
  id: recordIdSchema,
});

export type OwnerScope = z.infer<typeof ownerScopeSchema>;
