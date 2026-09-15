import { UomCategorySchema } from "#/schemas/enums";
import { IdSchema, MetadataSchema, NameSchema } from "#/schemas/utils";

import {
  boolean,
  gtValue,
  integer,
  maxLength,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const UomStatusSchema = pipe(
  string(),
  minLength(1, "Status is required"),
  maxLength(20, "Status must be at most 20 characters"),
);

export const CreateUnitOfMeasureSchema = object({
  baseUnitId: optional(nullable(IdSchema)),
  category: UomCategorySchema,
  code: pipe(
    string(),
    minLength(1, "Code is required"),
    maxLength(20, "Code must be at most 20 characters"),
  ),
  conversionFactor: optional(nullable(pipe(number(), gtValue(0, "Must be greater than 0")))),
  decimalPlaces: optional(pipe(number(), integer(), minValue(0, "Must be 0 or more")), 2),
  isActive: optional(boolean(), true),
  isBaseUnit: optional(boolean(), false),
  isDefault: optional(boolean(), false),
  isIndivisible: optional(boolean(), false),
  metadata: optional(nullable(MetadataSchema)),
  name: NameSchema,
  symbol: optional(nullable(pipe(string(), minLength(1), maxLength(20)))),
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
  decimalPlaces: optional(pipe(number(), integer(), minValue(0, "Must be 0 or more"))),
  factorChangeReason: optional(pipe(string(), minLength(1), maxLength(500))),
  isActive: optional(boolean()),
  isBaseUnit: optional(boolean()),
  isDefault: optional(boolean()),
  isIndivisible: optional(boolean()),
  metadata: optional(nullable(MetadataSchema)),
  name: optional(NameSchema),
  symbol: optional(nullable(pipe(string(), minLength(1), maxLength(20)))),
});

export type UpdateUnitOfMeasureInput = InferOutput<typeof UpdateUnitOfMeasureSchema>;

export const UnitOfMeasureFiltersSchema = object({
  category: optional(UomCategorySchema),
  isActive: optional(boolean()),
  search: optional(pipe(string(), minLength(1), maxLength(100))),
  status: optional(UomStatusSchema),
});

export type UnitOfMeasureFilters = InferOutput<typeof UnitOfMeasureFiltersSchema>;

export const ListUnitsOfMeasureSchema = object({
  filters: optional(UnitOfMeasureFiltersSchema),
  limit: optional(pipe(number(), integer(), minValue(1), maxValue(1000))),
  offset: optional(pipe(number(), integer(), minValue(0))),
});

export type ListUnitsOfMeasureInput = InferOutput<typeof ListUnitsOfMeasureSchema>;

export const RetireUnitOfMeasureSchema = object({
  id: IdSchema,
  reason: optional(pipe(string(), minLength(1), maxLength(500))),
});

export type RetireUnitOfMeasureInput = InferOutput<typeof RetireUnitOfMeasureSchema>;

export const SetDefaultUnitOfMeasureSchema = object({
  id: IdSchema,
});

export type SetDefaultUnitOfMeasureInput = InferOutput<typeof SetDefaultUnitOfMeasureSchema>;

export const ConvertQuantitySchema = object({
  fromUomId: IdSchema,
  quantity: pipe(number(), minValue(0, "Quantity cannot be negative")),
  toUomId: optional(nullable(IdSchema)),
});

export type ConvertQuantityInput = InferOutput<typeof ConvertQuantitySchema>;
