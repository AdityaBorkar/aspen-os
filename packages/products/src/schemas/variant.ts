import { IdSchema } from "#/schemas/utils";

import { array, boolean, nullable, object, optional, record, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateVariantSchema = object({
  attributes: record(string(), string()),
  itemName: optional(string()),
  manufacturerId: optional(nullable(IdSchema)),
  manufacturerPartNo: optional(nullable(string())),
  templateItemId: IdSchema,
});

export type CreateVariantInput = InferOutput<typeof CreateVariantSchema>;

export const CreateVariantCombinationsSchema = object({
  attributeValues: record(string(), array(string())),
  manufacturerId: optional(nullable(IdSchema)),
  templateItemId: IdSchema,
});

export type CreateVariantCombinationsInput = InferOutput<typeof CreateVariantCombinationsSchema>;

export const SyncVariantFromTemplateSchema = object({
  fields: optional(array(string())),
  variantId: IdSchema,
});

export type SyncVariantFromTemplateInput = InferOutput<typeof SyncVariantFromTemplateSchema>;

export const ListVariantsSchema = object({
  includeDisabled: optional(boolean(), false),
  templateItemId: IdSchema,
});

export type ListVariantsInput = InferOutput<typeof ListVariantsSchema>;
