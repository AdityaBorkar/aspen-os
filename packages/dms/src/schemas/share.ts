import {
  check,
  type InferOutput,
  nullish,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { GranteeTypeSchema, SharePermissionSchema } from "./enums";

export const CreateShareSchema = object({
  documentId: string(),
  expiresAt: optional(nullish(string())),
  granteeId: string(),
  granteeType: GranteeTypeSchema,
  permission: optional(SharePermissionSchema, "viewer"),
  sharedBy: string(),
});

export type CreateShareInput = InferOutput<typeof CreateShareSchema>;

export const UpdateShareSchema = object({
  expiresAt: optional(nullish(string())),
  permission: optional(SharePermissionSchema),
});

export type UpdateShareInput = InferOutput<typeof UpdateShareSchema>;

export const RemoveShareSchema = object({
  shareId: string(),
});

export type RemoveShareInput = InferOutput<typeof RemoveShareSchema>;

export const ResolveShareTokenSchema = object({
  token: pipe(
    string(),
    check((val) => val.length > 0, "Token is required"),
  ),
});

export type ResolveShareTokenInput = InferOutput<
  typeof ResolveShareTokenSchema
>;
