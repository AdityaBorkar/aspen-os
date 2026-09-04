import { RoleSchema } from "#/schemas/enums";
import { LimitSchema, NameSchema, OffsetSchema } from "#/schemas/utils";

import { nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreatePlatformUserSchema = object({
  email: string(),
  name: NameSchema,
  password: string(),
  role: RoleSchema,
  spId: optional(nullable(string())),
});

export type CreatePlatformUserInput = InferOutput<typeof CreatePlatformUserSchema>;

export const UpdatePlatformUserSchema = object({
  name: optional(NameSchema),
  role: optional(RoleSchema),
  spId: optional(nullable(string())),
});

export type UpdatePlatformUserInput = InferOutput<typeof UpdatePlatformUserSchema>;

export const PlatformUserFiltersSchema = object({
  limit: LimitSchema,
  offset: OffsetSchema,
  role: optional(RoleSchema),
  spId: optional(string()),
});

export type PlatformUserFilters = InferOutput<typeof PlatformUserFiltersSchema>;
