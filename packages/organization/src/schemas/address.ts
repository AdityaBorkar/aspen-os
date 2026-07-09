import {
  boolean,
  type InferOutput,
  maxLength,
  minLength,
  nullable,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { CountryCodeSchema } from "./utils";

export const CreateAddressSchema = object({
  city: optional(nullable(string())),
  country: CountryCodeSchema,
  isPrimary: optional(boolean(), false),
  label: optional(
    nullable(
      pipe(string(), maxLength(100, "Label must be at most 100 characters")),
    ),
  ),
  line1: pipe(string(), minLength(1, "Address line 1 is required")),
  line2: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  postalCode: optional(nullable(string())),
  state: optional(nullable(string())),
});

export type CreateAddressInput = InferOutput<typeof CreateAddressSchema>;

export const UpdateAddressSchema = object({
  city: optional(nullable(string())),
  country: optional(CountryCodeSchema),
  isPrimary: optional(boolean()),
  label: optional(
    nullable(
      pipe(string(), maxLength(100, "Label must be at most 100 characters")),
    ),
  ),
  line1: optional(string()),
  line2: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  postalCode: optional(nullable(string())),
  state: optional(nullable(string())),
});

export type UpdateAddressInput = InferOutput<typeof UpdateAddressSchema>;

export const AddressFiltersSchema = object({
  country: optional(string()),
  isPrimary: optional(boolean()),
});

export type AddressFilters = InferOutput<typeof AddressFiltersSchema>;
