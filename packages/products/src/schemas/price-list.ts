import { PriceListApplicabilitySchema } from "#/schemas/enums";
import { IdSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, nullish, number, object, optional, string } from "valibot";
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
  country: nullish(nullable(string())),
  currency: nullish(nullable(string())),
  defaultCustomerId: nullish(nullable(IdSchema)),
  defaultSupplierId: nullish(nullable(IdSchema)),
  isEnabled: optional(boolean()),
  name: optional(NameSchema),
  priceNotUomDependent: optional(boolean()),
  territory: nullish(nullable(string())),
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
  limit: optional(number()),
  offset: optional(number()),
});

export type ListPriceListsInput = InferOutput<typeof ListPriceListsSchema>;
