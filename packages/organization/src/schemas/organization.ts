import {
  date,
  type InferOutput,
  nullable,
  object,
  optional,
  string,
} from "valibot";

import { OrganizationStatusSchema } from "./enums";
import { AccentColorSchema, NameSchema, SlugSchema } from "./utils";

export const CreateOrganizationSchema = object({
  accentColor: AccentColorSchema,
  address: optional(nullable(string())),
  email: optional(nullable(string())),
  foundedDate: optional(date()),
  industry: optional(nullable(string())),
  locale: optional(string(), "en-US"),
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  phone: optional(nullable(string())),
  registrationNumber: optional(nullable(string())),
  slug: optional(SlugSchema),
  taxId: optional(nullable(string())),
  timezone: optional(string(), "UTC"),
  website: optional(nullable(string())),
});

export type CreateOrganizationInput = InferOutput<
  typeof CreateOrganizationSchema
>;

export const UpdateOrganizationSchema = object({
  accentColor: optional(AccentColorSchema),
  address: optional(nullable(string())),
  email: optional(nullable(string())),
  foundedDate: optional(date()),
  industry: optional(nullable(string())),
  locale: optional(string()),
  logo: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: optional(NameSchema),
  phone: optional(nullable(string())),
  registrationNumber: optional(nullable(string())),
  slug: optional(SlugSchema),
  status: optional(OrganizationStatusSchema),
  taxId: optional(nullable(string())),
  timezone: optional(string()),
  website: optional(nullable(string())),
});

export type UpdateOrganizationInput = InferOutput<
  typeof UpdateOrganizationSchema
>;

export const UpdateBrandingSchema = object({
  accentColor: optional(AccentColorSchema),
  logo: optional(nullable(string())),
  name: optional(NameSchema),
});

export type UpdateBrandingInput = InferOutput<typeof UpdateBrandingSchema>;
