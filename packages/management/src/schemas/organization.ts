import { HexColorSchema, LimitSchema, NameSchema, OffsetSchema, SlugSchema } from "#/schemas/utils";

import { nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const OrganizationBrandingSchema = object({
  logo: optional(nullable(string())),
  primaryColor: optional(HexColorSchema),
});

export type OrganizationBranding = InferOutput<typeof OrganizationBrandingSchema>;

export const CreateOrganizationSchema = object({
  branding: optional(nullable(OrganizationBrandingSchema)),
  name: NameSchema,
  slug: SlugSchema,
});

export type CreateOrganizationInput = InferOutput<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = object({
  branding: optional(nullable(OrganizationBrandingSchema)),
  name: optional(NameSchema),
  slug: optional(SlugSchema),
});

export type UpdateOrganizationInput = InferOutput<typeof UpdateOrganizationSchema>;

export const OrganizationFiltersSchema = object({
  limit: LimitSchema,
  offset: OffsetSchema,
  search: optional(string()),
});

export type OrganizationFilters = InferOutput<typeof OrganizationFiltersSchema>;
