import { MasterEntityTypeSchema } from "#/schemas/enums";
import { CountryCodeSchema, IdSchema, MetadataSchema } from "#/schemas/utils";

import { maxLength, minLength, nullable, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAddressSchema = object({
  city: optional(nullable(string())),
  country: CountryCodeSchema,
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  label: optional(nullable(pipe(string(), maxLength(100, "Label must be at most 100 characters")))),
  line1: pipe(string(), minLength(1, "Address line 1 is required")),
  line2: optional(nullable(string())),
  metadata: optional(nullable(MetadataSchema)),
  postalCode: optional(nullable(string())),
  state: optional(nullable(string())),
});

export type CreateAddressInput = InferOutput<typeof CreateAddressSchema>;

export const UpdateAddressSchema = object({
  city: optional(nullable(string())),
  country: optional(CountryCodeSchema),
  label: optional(nullable(pipe(string(), maxLength(100, "Label must be at most 100 characters")))),
  line1: optional(string()),
  line2: optional(nullable(string())),
  metadata: optional(nullable(MetadataSchema)),
  postalCode: optional(nullable(string())),
  state: optional(nullable(string())),
});

export type UpdateAddressInput = InferOutput<typeof UpdateAddressSchema>;

export const AddressFiltersSchema = object({
  country: optional(string()),
});

export type AddressFilters = InferOutput<typeof AddressFiltersSchema>;

export const ListAddressesSchema = object({
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  filters: optional(AddressFiltersSchema),
});

export type ListAddressesInput = InferOutput<typeof ListAddressesSchema>;
