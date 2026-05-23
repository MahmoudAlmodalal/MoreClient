import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const cursorSchema = z.string().optional();

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: cursorSchema,
});

export const principalTypeSchema = z.enum(["company", "talent"]);

export const localeSchema = z.enum(["en", "ar"]);

export const currencySchema = z.string().length(3).default("USD");

export const problemJsonSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  requestId: z.string(),
  instance: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PrincipalType = z.infer<typeof principalTypeSchema>;
