import { SpStatusSchema } from "#/schemas/enums";
import {
  EmailSchema,
  LimitSchema,
  NameSchema,
  OffsetSchema,
  SlugSchema,
  WebsiteSchema,
} from "#/schemas/utils";

import { nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateServiceProviderSchema = object({
  address: optional(nullable(string())),
  description: optional(nullable(string())),
  email: EmailSchema,
  logo: optional(nullable(string())),
  name: NameSchema,
  phone: optional(nullable(string())),
  slug: SlugSchema,
  website: WebsiteSchema,
});

export type CreateServiceProviderInput = InferOutput<typeof CreateServiceProviderSchema>;

export const UpdateServiceProviderSchema = object({
  address: optional(string()),
  description: optional(string()),
  email: optional(EmailSchema),
  logo: optional(string()),
  name: optional(NameSchema),
  phone: optional(string()),
  slug: optional(SlugSchema),
  website: optional(WebsiteSchema),
});

export type UpdateServiceProviderInput = InferOutput<typeof UpdateServiceProviderSchema>;

export const ServiceProviderFiltersSchema = object({
  limit: LimitSchema,
  offset: OffsetSchema,
  search: optional(string()),
  status: optional(SpStatusSchema),
});

export type ServiceProviderFilters = InferOutput<typeof ServiceProviderFiltersSchema>;
