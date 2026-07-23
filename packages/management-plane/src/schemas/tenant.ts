import {
  boolean,
  type InferOutput,
  integer,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { TenantStatusSchema } from "./enums";
import { NameSchema, SlugSchema } from "./utils";

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

export type UpdateTenantProfileInput = InferOutput<
  typeof UpdateTenantProfileSchema
>;

export const UpdateTenantCompanionSchema = object({
  plan: optional(nullable(string())),
  status: optional(TenantStatusSchema),
});

export type UpdateTenantCompanionInput = InferOutput<
  typeof UpdateTenantCompanionSchema
>;

export const UpdateTenantSchema = object({
  logo: optional(nullable(string())),
  name: optional(NameSchema),
  plan: optional(nullable(string())),
  slug: optional(SlugSchema),
  status: optional(TenantStatusSchema),
});

export type UpdateTenantInput = InferOutput<typeof UpdateTenantSchema>;

export const TenantFiltersSchema = object({
  plan: optional(string()),
  search: optional(string()),
  serviceProviderId: optional(string()),
  status: optional(string()),
});

export type TenantFilters = InferOutput<typeof TenantFiltersSchema>;
