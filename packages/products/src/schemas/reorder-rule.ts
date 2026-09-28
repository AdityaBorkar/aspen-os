import { MaterialRequestTypeSchema } from "#/schemas/enums";
import { IdSchema, ListPaginationSchema } from "#/schemas/utils";

import { boolean, nullable, number, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateReorderRuleSchema = object({
  checkInGroupId: IdSchema,
  itemId: IdSchema,
  materialRequestType: optional(MaterialRequestTypeSchema, "purchase"),
  reorderLevel: number(),
  reorderQty: number(),
  requestForWarehouseId: IdSchema,
});

export type CreateReorderRuleInput = InferOutput<typeof CreateReorderRuleSchema>;

export const UpdateReorderRuleSchema = object({
  checkInGroupId: optional(IdSchema),
  isDisabled: optional(boolean()),
  materialRequestType: optional(MaterialRequestTypeSchema),
  reorderLevel: optional(number()),
  reorderQty: optional(number()),
  requestForWarehouseId: optional(IdSchema),
});

export type UpdateReorderRuleInput = InferOutput<typeof UpdateReorderRuleSchema>;

export const ReorderRuleFiltersSchema = object({
  checkInGroupId: optional(IdSchema),
  isDisabled: optional(boolean()),
  itemId: optional(IdSchema),
  materialRequestType: optional(MaterialRequestTypeSchema),
});

export type ReorderRuleFilters = InferOutput<typeof ReorderRuleFiltersSchema>;

export const ListReorderRulesSchema = object({
  filters: optional(ReorderRuleFiltersSchema),
  ...ListPaginationSchema.entries,
});

export type ListReorderRulesInput = InferOutput<typeof ListReorderRulesSchema>;

export const GetByCodeSchema = object({
  itemCode: string(),
});

export type GetByCodeInput = InferOutput<typeof GetByCodeSchema>;

export const GetByBarcodeSchema = object({
  barcode: string(),
});

export type GetByBarcodeInput = InferOutput<typeof GetByBarcodeSchema>;

export const ListByGroupSchema = object({
  includeDescendants: optional(boolean(), true),
  itemGroupId: IdSchema,
  ...ListPaginationSchema.entries,
});

export type ListByGroupInput = InferOutput<typeof ListByGroupSchema>;

export const ResolveDefaultsSchema = object({
  itemId: IdSchema,
});

export type ResolveDefaultsInput = InferOutput<typeof ResolveDefaultsSchema>;

export const AddAlternativeByCodeSchema = object({
  alternativeItemCode: string(),
  isTwoWay: optional(boolean(), false),
  itemCode: string(),
});

export type AddAlternativeByCodeInput = InferOutput<typeof AddAlternativeByCodeSchema>;

export const LookupFiltersSchema = object({
  search: optional(string()),
});

export type LookupFilters = InferOutput<typeof LookupFiltersSchema>;

export const ItemTaxFiltersSchema = object({
  itemId: optional(IdSchema),
  taxCategory: optional(nullable(string())),
});

export type ItemTaxFilters = InferOutput<typeof ItemTaxFiltersSchema>;
