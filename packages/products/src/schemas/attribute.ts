import { IdSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateAttributeSchema = object({
  isNumeric: optional(boolean(), false),
  name: NameSchema,
  unit: optional(nullable(string())),
});

export type CreateAttributeInput = InferOutput<typeof CreateAttributeSchema>;

export const UpdateAttributeSchema = object({
  isDisabled: optional(boolean()),
  isNumeric: optional(boolean()),
  name: optional(NameSchema),
  unit: optional(nullable(string())),
});

export type UpdateAttributeInput = InferOutput<typeof UpdateAttributeSchema>;

export const AttributeFiltersSchema = object({
  isDisabled: optional(boolean()),
  isNumeric: optional(boolean()),
  search: optional(string()),
});

export type AttributeFilters = InferOutput<typeof AttributeFiltersSchema>;

export const ListAttributesSchema = object({
  filters: optional(AttributeFiltersSchema),
  limit: optional(number()),
  offset: optional(number()),
});

export type ListAttributesInput = InferOutput<typeof ListAttributesSchema>;

export const AddAttributeValueSchema = object({
  attributeId: IdSchema,
  rangeHigh: optional(nullable(number())),
  rangeIncrement: optional(nullable(number())),
  rangeLow: optional(nullable(number())),
  sortOrder: optional(number(), 0),
  value: string(),
});

export type AddAttributeValueInput = InferOutput<typeof AddAttributeValueSchema>;

export const UpdateAttributeValueSchema = object({
  rangeHigh: optional(nullable(number())),
  rangeIncrement: optional(nullable(number())),
  rangeLow: optional(nullable(number())),
  sortOrder: optional(number()),
  value: optional(string()),
});

export type UpdateAttributeValueInput = InferOutput<typeof UpdateAttributeValueSchema>;

export const ListAttributeValuesSchema = object({
  attributeId: IdSchema,
});

export type ListAttributeValuesInput = InferOutput<typeof ListAttributeValuesSchema>;

export const AddTemplateAttributeSchema = object({
  attributeId: IdSchema,
  isRequired: optional(boolean(), true),
  templateItemId: IdSchema,
});

export type AddTemplateAttributeInput = InferOutput<typeof AddTemplateAttributeSchema>;

export const ListTemplateAttributesSchema = object({
  templateItemId: IdSchema,
});

export type ListTemplateAttributesInput = InferOutput<typeof ListTemplateAttributesSchema>;
