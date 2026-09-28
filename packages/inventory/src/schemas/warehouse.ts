import { WarehouseTypeSchema } from "#/schemas/enums";
import { IdSchema, PaginationSchema, WarehouseNameSchema } from "#/schemas/utils";

import { boolean, maxLength, minLength, nullable, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateWarehouseTypeSchema = object({
  code: pipe(
    string(),
    minLength(1, "Code is required"),
    maxLength(64, "Must be at most 64 characters"),
  ),
  description: optional(nullable(string())),
  name: WarehouseNameSchema,
});

export type CreateWarehouseTypeInput = InferOutput<typeof CreateWarehouseTypeSchema>;

export const UpdateWarehouseTypeSchema = object({
  description: optional(nullable(string())),
  isDisabled: optional(boolean()),
  name: optional(WarehouseNameSchema),
});

export type UpdateWarehouseTypeInput = InferOutput<typeof UpdateWarehouseTypeSchema>;

export const WarehouseTypeFiltersSchema = object({
  ...PaginationSchema.entries,
  includeDisabled: optional(boolean(), false),
});

export type WarehouseTypeFiltersInput = InferOutput<typeof WarehouseTypeFiltersSchema>;

export const CreateWarehouseSchema = object({
  accountHead: optional(nullable(string())),
  addressId: optional(nullable(IdSchema)),
  contactId: optional(nullable(IdSchema)),
  isGroup: optional(boolean(), false),
  name: WarehouseNameSchema,
  parentId: optional(nullable(IdSchema)),
  warehouseType: optional(WarehouseTypeSchema, "stock"),
});

export type CreateWarehouseInput = InferOutput<typeof CreateWarehouseSchema>;

export const UpdateWarehouseSchema = object({
  accountHead: optional(nullable(string())),
  addressId: optional(nullable(IdSchema)),
  contactId: optional(nullable(IdSchema)),
  isGroup: optional(boolean()),
  name: optional(WarehouseNameSchema),
  parentId: optional(nullable(IdSchema)),
  warehouseType: optional(WarehouseTypeSchema),
});

export type UpdateWarehouseInput = InferOutput<typeof UpdateWarehouseSchema>;

export const WarehouseFiltersSchema = object({
  ...PaginationSchema.entries,
  includeDisabled: optional(boolean(), false),
  isGroup: optional(boolean()),
  parentId: optional(nullable(IdSchema)),
  warehouseType: optional(WarehouseTypeSchema),
});

export type WarehouseFiltersInput = InferOutput<typeof WarehouseFiltersSchema>;
