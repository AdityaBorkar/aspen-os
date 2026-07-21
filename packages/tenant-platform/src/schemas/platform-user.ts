import { type InferOutput, nullable, object, optional, string } from "valibot";

import { RoleSchema } from "./enums";
import { NameSchema } from "./utils";

export const CreatePlatformUserSchema = object({
  email: nullable(string()),
  name: NameSchema,
  password: optional(string()),
  role: RoleSchema,
  spId: optional(nullable(string())),
});

export type CreatePlatformUserInput = InferOutput<
  typeof CreatePlatformUserSchema
>;

export const UpdatePlatformUserSchema = object({
  name: optional(NameSchema),
  role: optional(RoleSchema),
  spId: optional(nullable(string())),
});

export type UpdatePlatformUserInput = InferOutput<
  typeof UpdatePlatformUserSchema
>;

export const PlatformUserFiltersSchema = object({
  role: optional(string()),
  spId: optional(string()),
});

export type PlatformUserFilters = InferOutput<typeof PlatformUserFiltersSchema>;
