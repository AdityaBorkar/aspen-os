import { IdSchema, NameSchema, SlugSchema } from "#/schemas/utils";

import { email, minLength, object, optional, picklist, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const TenantMemberRoleSchema = picklist(["admin", "member"]);

export type TenantMemberRole = InferOutput<typeof TenantMemberRoleSchema>;

const TenantMemberPasswordSchema = pipe(
  string(),
  minLength(8, "Password must be at least 8 characters"),
);

const TenantMemberEmailSchema = pipe(string(), email("Enter a valid email address"));

export const CreateTenantMemberPayloadSchema = object({
  email: TenantMemberEmailSchema,
  name: NameSchema,
  password: TenantMemberPasswordSchema,
  role: TenantMemberRoleSchema,
});

export type CreateTenantMemberPayload = InferOutput<typeof CreateTenantMemberPayloadSchema>;

export const UpdateTenantMemberPatchSchema = object({
  name: optional(NameSchema),
  role: optional(TenantMemberRoleSchema),
});

export type UpdateTenantMemberPatch = InferOutput<typeof UpdateTenantMemberPatchSchema>;

export const TenantMemberIdPayloadSchema = object({
  id: pipe(string(), minLength(1, "User ID is required")),
});

export type TenantMemberIdPayload = InferOutput<typeof TenantMemberIdPayloadSchema>;

export const UpdateTenantMemberPayloadSchema = object({
  id: pipe(string(), minLength(1, "User ID is required")),
  patch: UpdateTenantMemberPatchSchema,
});

export type UpdateTenantMemberPayload = InferOutput<typeof UpdateTenantMemberPayloadSchema>;

export const TenantMemberListInputSchema = object({
  slug: SlugSchema,
});

export type TenantMemberListInput = InferOutput<typeof TenantMemberListInputSchema>;

export const TenantMemberGetInputSchema = object({
  id: pipe(string(), minLength(1, "User ID is required")),
  slug: SlugSchema,
});

export type TenantMemberGetInput = InferOutput<typeof TenantMemberGetInputSchema>;

export const CreateTenantMemberInputSchema = object({
  email: TenantMemberEmailSchema,
  name: NameSchema,
  password: TenantMemberPasswordSchema,
  role: TenantMemberRoleSchema,
  slug: SlugSchema,
});

export type CreateTenantMemberInput = InferOutput<typeof CreateTenantMemberInputSchema>;

export const UpdateTenantMemberInputSchema = object({
  id: pipe(string(), minLength(1, "User ID is required")),
  patch: UpdateTenantMemberPatchSchema,
  slug: SlugSchema,
});

export type UpdateTenantMemberInput = InferOutput<typeof UpdateTenantMemberInputSchema>;

export const RemoveTenantMemberInputSchema = object({
  id: pipe(string(), minLength(1, "User ID is required")),
  slug: SlugSchema,
});

export type RemoveTenantMemberInput = InferOutput<typeof RemoveTenantMemberInputSchema>;

export const TenantsByUserListInputSchema = object({
  userId: IdSchema,
});

export type TenantsByUserListInput = InferOutput<typeof TenantsByUserListInputSchema>;
