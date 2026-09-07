import { EntityTypeSchema, GranteeTypeSchema, SharePermissionSchema } from "#/schemas/enums";
import { nonEmptyString } from "#/schemas/utils";

import { check, date, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateShareSchema = object({
  entityId: nonEmptyString("entityId is required"),
  entityType: EntityTypeSchema,
  expiresAt: optional(nullable(date())),
  granteeId: nonEmptyString("granteeId is required"),
  granteeType: GranteeTypeSchema,
  message: optional(nullable(string())),
  permission: optional(SharePermissionSchema, "viewer"),
  sharedBy: nonEmptyString("sharedBy is required"),
});

export type CreateShareInput = InferOutput<typeof CreateShareSchema>;

export const UpdateShareSchema = object({
  expiresAt: optional(nullable(date())),
  permission: optional(SharePermissionSchema),
});

export type UpdateShareInput = InferOutput<typeof UpdateShareSchema>;

export const ResolveShareTokenSchema = object({
  token: pipe(
    string(),
    check((val) => val.length > 0, "Token is required"),
  ),
});

export type ResolveShareTokenInput = InferOutput<typeof ResolveShareTokenSchema>;

export const ListSharedWithMeOptionsSchema = object({
  limit: optional(number(), 50),
  offset: optional(number(), 0),
});

export type ListSharedWithMeOptions = InferOutput<typeof ListSharedWithMeOptionsSchema>;

/**
 * Parse a share expiry value (Date or string) into a Date, returning null for
 * nullish input. Throws on invalid dates.
 */
export function parseShareExpiry(value: Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid expiresAt value: "${String(value)}".`);
  }
  return parsed;
}
