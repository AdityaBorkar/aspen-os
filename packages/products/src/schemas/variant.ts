import { IdSchema } from "#/schemas/utils";
import { VARIANT_SYNC_ALLOWLIST } from "#/utils/constants";

import {
  array,
  boolean,
  check,
  minLength,
  nullable,
  object,
  optional,
  picklist,
  pipe,
  record,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateVariantSchema = object({
  attributes: pipe(
    record(pipe(string(), minLength(1)), pipe(string(), minLength(1))),
    check((attributes) => Object.keys(attributes).length >= 1, "at least one attribute required"),
  ),
  itemName: optional(string()),
  manufacturerId: optional(nullable(IdSchema)),
  manufacturerPartNo: optional(nullable(string())),
  templateItemId: IdSchema,
});

export type CreateVariantInput = InferOutput<typeof CreateVariantSchema>;

export const CreateVariantCombinationsSchema = object({
  attributeValues: pipe(
    record(pipe(string(), minLength(1)), array(pipe(string(), minLength(1)))),
    check(
      (attributeValues) => Object.keys(attributeValues).length >= 1,
      "at least one attribute required",
    ),
  ),
  manufacturerId: optional(nullable(IdSchema)),
  templateItemId: IdSchema,
});

export type CreateVariantCombinationsInput = InferOutput<typeof CreateVariantCombinationsSchema>;

export const SyncVariantFromTemplateSchema = object({
  fields: optional(array(picklist(VARIANT_SYNC_ALLOWLIST))),
  variantId: IdSchema,
});

export type SyncVariantFromTemplateInput = InferOutput<typeof SyncVariantFromTemplateSchema>;

export const ListVariantsSchema = object({
  includeDisabled: optional(boolean(), false),
  templateItemId: IdSchema,
});

export type ListVariantsInput = InferOutput<typeof ListVariantsSchema>;
