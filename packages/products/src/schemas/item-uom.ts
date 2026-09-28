import { IdSchema } from "#/schemas/utils";

import { boolean, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const AddAlternativeSchema = object({
  alternativeItemId: IdSchema,
  isTwoWay: optional(boolean(), false),
  itemId: IdSchema,
});

export type AddAlternativeInput = InferOutput<typeof AddAlternativeSchema>;

export const ListAlternativesSchema = object({
  itemId: IdSchema,
});

export type ListAlternativesInput = InferOutput<typeof ListAlternativesSchema>;

export const AddItemUomSchema = object({
  conversionFactor: number(),
  itemId: IdSchema,
  mustBeWholeNumber: optional(boolean(), false),
  uom: string(),
});

export type AddItemUomInput = InferOutput<typeof AddItemUomSchema>;

export const UpdateItemUomSchema = object({
  conversionFactor: optional(number()),
  mustBeWholeNumber: optional(boolean()),
  recalculate: optional(boolean(), false),
});

export type UpdateItemUomInput = InferOutput<typeof UpdateItemUomSchema>;

export const ListItemUomsSchema = object({
  itemId: IdSchema,
});

export type ListItemUomsInput = InferOutput<typeof ListItemUomsSchema>;

export const AddItemUomByCodeSchema = object({
  conversionFactor: number(),
  itemCode: string(),
  mustBeWholeNumber: optional(boolean(), false),
  uom: string(),
});

export type AddItemUomByCodeInput = InferOutput<typeof AddItemUomByCodeSchema>;
