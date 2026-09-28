import { IdSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateManufacturerSchema = object({
  country: optional(nullable(string())),
  description: optional(nullable(string())),
  name: NameSchema,
  website: optional(nullable(string())),
});

export type CreateManufacturerInput = InferOutput<typeof CreateManufacturerSchema>;

export const UpdateManufacturerSchema = object({
  country: optional(nullable(string())),
  description: optional(nullable(string())),
  isDisabled: optional(boolean()),
  name: optional(NameSchema),
  website: optional(nullable(string())),
});

export type UpdateManufacturerInput = InferOutput<typeof UpdateManufacturerSchema>;

export const ManufacturerFiltersSchema = object({
  isDisabled: optional(boolean()),
  search: optional(string()),
});

export type ManufacturerFilters = InferOutput<typeof ManufacturerFiltersSchema>;

export const ListManufacturersSchema = object({
  filters: optional(ManufacturerFiltersSchema),
  limit: optional(number()),
  offset: optional(number()),
});

export type ListManufacturersInput = InferOutput<typeof ListManufacturersSchema>;

export const AddManufacturerPartSchema = object({
  itemId: IdSchema,
  manufacturerId: IdSchema,
  manufacturerPartNo: string(),
});

export type AddManufacturerPartInput = InferOutput<typeof AddManufacturerPartSchema>;

export const ListManufacturerPartsSchema = object({
  itemId: optional(IdSchema),
  manufacturerId: optional(IdSchema),
});

export type ListManufacturerPartsInput = InferOutput<typeof ListManufacturerPartsSchema>;
