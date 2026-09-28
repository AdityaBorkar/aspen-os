import { PriceListApplicabilitySchema } from "#/schemas/enums";
import { IdSchema, ListPaginationSchema, NameSchema, clearable } from "#/schemas/utils";

import { boolean, nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreatePriceListSchema = object({
  applicability: optional(PriceListApplicabilitySchema, "both"),
  country: optional(nullable(string())),
  currency: optional(nullable(string())),
  defaultCustomerId: optional(nullable(IdSchema)),
  defaultSupplierId: optional(nullable(IdSchema)),
  isEnabled: optional(boolean(), true),
  name: NameSchema,
  priceNotUomDependent: optional(boolean(), false),
  territory: optional(nullable(string())),
});

export type CreatePriceListInput = InferOutput<typeof CreatePriceListSchema>;

export const UpdatePriceListSchema = object({
  applicability: optional(PriceListApplicabilitySchema),
  country: clearable(string()),
  currency: clearable(string()),
  defaultCustomerId: clearable(IdSchema),
  defaultSupplierId: clearable(IdSchema),
  isEnabled: optional(boolean()),
  name: optional(NameSchema),
  priceNotUomDependent: optional(boolean()),
  territory: clearable(string()),
});

export type UpdatePriceListInput = InferOutput<typeof UpdatePriceListSchema>;

export const PriceListFiltersSchema = object({
  applicability: optional(PriceListApplicabilitySchema),
  isEnabled: optional(boolean()),
  search: optional(string()),
});

export type PriceListFilters = InferOutput<typeof PriceListFiltersSchema>;

export const ListPriceListsSchema = object({
  filters: optional(PriceListFiltersSchema),
  ...ListPaginationSchema.entries,
});

export type ListPriceListsInput = InferOutput<typeof ListPriceListsSchema>;
