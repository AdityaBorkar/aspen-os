import { EntityTypeSchema, GranteeTypeSchema, SharePermissionSchema } from "#/schemas/enums";

import {
  check,
  minLength,
  nullable,
  nullish,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateShareSchema = object({
  entityId: pipe(string(), minLength(1, "entityId is required")),
  entityType: EntityTypeSchema,
  expiresAt: optional(nullish(string())),
  granteeId: pipe(string(), minLength(1, "granteeId is required")),
  granteeType: GranteeTypeSchema,
  message: optional(nullable(string())),
  permission: optional(SharePermissionSchema, "viewer"),
  sharedBy: pipe(string(), minLength(1, "sharedBy is required")),
});

export type CreateShareInput = InferOutput<typeof CreateShareSchema>;

export const UpdateShareSchema = object({
  expiresAt: optional(nullish(string())),
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
