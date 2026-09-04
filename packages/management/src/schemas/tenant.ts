import { TenantStatusSchema } from "#/schemas/enums";
import { LimitSchema, NameSchema, OffsetSchema, SlugSchema } from "#/schemas/utils";

import { boolean, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const ProvisionTenantSchema = object({
  databaseHost: optional(nullable(string())),
  databaseName: optional(nullable(string())),
  databasePassword: optional(nullable(string())),
  databasePort: optional(nullable(pipe(number(), integer()))),
  databaseSsl: optional(nullable(boolean())),
  databaseUser: optional(nullable(string())),
  logo: optional(nullable(string())),
  name: NameSchema,
  plan: optional(nullable(string())),
  serviceProviderId: optional(nullable(string())),
  slug: SlugSchema,
});

export type ProvisionTenantInput = InferOutput<typeof ProvisionTenantSchema>;

export const UpdateTenantProfileSchema = object({
  logo: optional(nullable(string())),
  name: optional(NameSchema),
  slug: optional(SlugSchema),
});

export type UpdateTenantProfileInput = InferOutput<typeof UpdateTenantProfileSchema>;

export const UpdateTenantCompanionSchema = object({
  plan: optional(nullable(string())),
});

export type UpdateTenantCompanionInput = InferOutput<typeof UpdateTenantCompanionSchema>;

export const TenantFiltersSchema = object({
  limit: LimitSchema,
  offset: OffsetSchema,
  plan: optional(string()),
  search: optional(string()),
  serviceProviderId: optional(string()),
  status: optional(TenantStatusSchema),
});

export type TenantFilters = InferOutput<typeof TenantFiltersSchema>;
