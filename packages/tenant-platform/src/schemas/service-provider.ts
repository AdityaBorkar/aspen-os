import { type InferOutput, nullable, object, optional, string } from "valibot";

import { NameSchema, SlugSchema } from "./utils";

export const CreateServiceProviderSchema = object({
  address: optional(nullable(string())),
  description: optional(nullable(string())),
  email: optional(nullable(string())),
  logo: optional(nullable(string())),
  name: NameSchema,
  phone: optional(nullable(string())),
  slug: SlugSchema,
  website: optional(nullable(string())),
});

export type CreateServiceProviderInput = InferOutput<
  typeof CreateServiceProviderSchema
>;

export const UpdateServiceProviderSchema = object({
  address: optional(nullable(string())),
  description: optional(nullable(string())),
  email: optional(nullable(string())),
  logo: optional(nullable(string())),
  name: optional(NameSchema),
  phone: optional(nullable(string())),
  slug: optional(SlugSchema),
  website: optional(nullable(string())),
});

export type UpdateServiceProviderInput = InferOutput<
  typeof UpdateServiceProviderSchema
>;

export const ServiceProviderFiltersSchema = object({
  search: optional(string()),
  status: optional(string()),
});

export type ServiceProviderFilters = InferOutput<
  typeof ServiceProviderFiltersSchema
>;
