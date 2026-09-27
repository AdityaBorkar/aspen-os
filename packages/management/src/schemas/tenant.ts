import { TenantStatusSchema } from "#/schemas/enums";
import { LogoStorageKeySchema } from "#/schemas/logo";
import { LimitSchema, NameSchema, OffsetSchema, SlugSchema } from "#/schemas/utils";

import { nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const ProvisionTenantSchema = object({
  logo: optional(nullable(LogoStorageKeySchema)),
  name: NameSchema,
  plan: optional(nullable(string())),
  serviceProviderId: optional(nullable(string())),
  slug: SlugSchema,
});

export type ProvisionTenantInput = InferOutput<typeof ProvisionTenantSchema>;

export const UpdateTenantProfileSchema = object({
  logo: optional(nullable(LogoStorageKeySchema)),
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
