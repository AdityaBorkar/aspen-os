import { IdSchema, ListPaginationSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateBrandSchema = object({
  description: optional(nullable(string())),
  imageFileId: optional(nullable(IdSchema)),
  name: NameSchema,
});

export type CreateBrandInput = InferOutput<typeof CreateBrandSchema>;

export const UpdateBrandSchema = object({
  description: optional(nullable(string())),
  imageFileId: optional(nullable(IdSchema)),
  isDisabled: optional(boolean()),
  name: optional(NameSchema),
});

export type UpdateBrandInput = InferOutput<typeof UpdateBrandSchema>;

export const BrandFiltersSchema = object({
  isDisabled: optional(boolean()),
  search: optional(string()),
});

export type BrandFilters = InferOutput<typeof BrandFiltersSchema>;

export const ListBrandsSchema = object({
  filters: optional(BrandFiltersSchema),
  ...ListPaginationSchema.entries,
});

export type ListBrandsInput = InferOutput<typeof ListBrandsSchema>;
