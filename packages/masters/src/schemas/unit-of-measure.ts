import { UomCategorySchema } from "#/schemas/enums";
import { IdSchema, NameSchema } from "#/schemas/utils";

import {
  boolean,
  gtValue,
  integer,
  maxLength,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateUnitOfMeasureSchema = object({
  baseUnitId: optional(nullable(IdSchema)),
  category: UomCategorySchema,
  code: pipe(
    string(),
    minLength(1, "Code is required"),
    maxLength(20, "Code must be at most 20 characters"),
  ),
  conversionFactor: optional(nullable(pipe(number(), gtValue(0, "Must be greater than 0")))),
  decimalPlaces: optional(pipe(number(), integer()), 2),
  isActive: optional(boolean(), true),
  isBaseUnit: optional(boolean(), false),
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  symbol: optional(nullable(string())),
});

export type CreateUnitOfMeasureInput = InferOutput<typeof CreateUnitOfMeasureSchema>;

export const UpdateUnitOfMeasureSchema = object({
  baseUnitId: optional(nullable(IdSchema)),
  category: optional(UomCategorySchema),
  code: optional(
    pipe(
      string(),
      minLength(1, "Code is required"),
      maxLength(20, "Code must be at most 20 characters"),
    ),
  ),
  conversionFactor: optional(nullable(pipe(number(), gtValue(0, "Must be greater than 0")))),
  decimalPlaces: optional(pipe(number(), integer())),
  isActive: optional(boolean()),
  isBaseUnit: optional(boolean()),
  metadata: optional(object({})),
  name: optional(NameSchema),
  symbol: optional(nullable(string())),
});

export type UpdateUnitOfMeasureInput = InferOutput<typeof UpdateUnitOfMeasureSchema>;

export const UnitOfMeasureFiltersSchema = object({
  category: optional(UomCategorySchema),
  isActive: optional(boolean()),
});

export type UnitOfMeasureFilters = InferOutput<typeof UnitOfMeasureFiltersSchema>;

export const ListUnitsOfMeasureSchema = object({
  filters: optional(UnitOfMeasureFiltersSchema),
});

export type ListUnitsOfMeasureInput = InferOutput<typeof ListUnitsOfMeasureSchema>;
