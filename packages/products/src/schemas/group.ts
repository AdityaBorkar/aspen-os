import { IdSchema, ListPaginationSchema, NameSchema } from "#/schemas/utils";

import { boolean, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateGroupSchema = object({
  defaultCostCenter: optional(nullable(string())),
  defaultExpenseAccount: optional(nullable(string())),
  defaultIncomeAccount: optional(nullable(string())),
  defaultItemTaxTemplate: optional(nullable(string())),
  defaultPriceList: optional(nullable(string())),
  defaultSupplierId: optional(nullable(IdSchema)),
  defaultWarehouseId: optional(nullable(IdSchema)),
  isGroup: optional(boolean(), false),
  name: NameSchema,
  namingPrefix: optional(nullable(string())),
  namingSeries: optional(nullable(string())),
  parentId: optional(nullable(IdSchema)),
  showInWebsite: optional(boolean(), false),
  taxCategory: optional(nullable(string())),
  weightage: optional(nullable(pipe(number(), integer()))),
});

export type CreateGroupInput = InferOutput<typeof CreateGroupSchema>;

export const UpdateGroupSchema = object({
  defaultCostCenter: optional(nullable(string())),
  defaultExpenseAccount: optional(nullable(string())),
  defaultIncomeAccount: optional(nullable(string())),
  defaultItemTaxTemplate: optional(nullable(string())),
  defaultPriceList: optional(nullable(string())),
  defaultSupplierId: optional(nullable(IdSchema)),
  defaultWarehouseId: optional(nullable(IdSchema)),
  isDisabled: optional(boolean()),
  isGroup: optional(boolean()),
  name: optional(NameSchema),
  namingPrefix: optional(nullable(string())),
  namingSeries: optional(nullable(string())),
  parentId: optional(nullable(IdSchema)),
  showInWebsite: optional(boolean()),
  taxCategory: optional(nullable(string())),
  weightage: optional(nullable(pipe(number(), integer()))),
});

export type UpdateGroupInput = InferOutput<typeof UpdateGroupSchema>;

export const GroupFiltersSchema = object({
  isDisabled: optional(boolean()),
  isGroup: optional(boolean()),
  parentId: optional(nullable(IdSchema)),
  search: optional(string()),
});

export type GroupFilters = InferOutput<typeof GroupFiltersSchema>;

export const ListGroupsSchema = object({
  filters: optional(GroupFiltersSchema),
  ...ListPaginationSchema.entries,
});

export type ListGroupsInput = InferOutput<typeof ListGroupsSchema>;
