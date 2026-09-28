import { ItemPriceStatusSchema } from "#/schemas/enums";
import { IdSchema, ListPaginationSchema, clearable } from "#/schemas/utils";
import { ITEM_PRICE_STATUS } from "#/utils/constants";

import {
  array,
  check,
  date,
  integer,
  minValue,
  nullable,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateItemPriceSchema = object({
  batchNo: optional(nullable(string())),
  customerId: optional(nullable(IdSchema)),
  itemId: IdSchema,
  leadTimeDays: optional(nullable(pipe(number(), integer()))),
  minQty: optional(nullable(number())),
  note: optional(nullable(string())),
  packingUnit: optional(nullable(number())),
  priceListId: IdSchema,
  rate: number(),
  // Create allows only active|draft by design; cancel/expire go via dedicated workflows.
  status: optional(
    picklist([ITEM_PRICE_STATUS.ACTIVE, ITEM_PRICE_STATUS.DRAFT]),
    ITEM_PRICE_STATUS.ACTIVE,
  ),
  supplierId: optional(nullable(IdSchema)),
  // Null/absent falls back to item.default_uom in pricing-validation.ts.
  uom: optional(nullable(string())),
  // Null/absent defaults to today in pricing-validation.ts.
  validFrom: optional(nullable(date())),
  validUpto: optional(nullable(date())),
});

export type CreateItemPriceInput = InferOutput<typeof CreateItemPriceSchema>;

// Status is intentionally omitted: cancel/expire go via dedicated workflows.
export const UpdateItemPriceSchema = object({
  leadTimeDays: clearable(pipe(number(), integer())),
  minQty: clearable(number()),
  note: clearable(string()),
  packingUnit: clearable(number()),
  rate: optional(number()),
  uom: optional(string()),
  validFrom: optional(date()),
  validUpto: clearable(date()),
});

export type UpdateItemPriceInput = InferOutput<typeof UpdateItemPriceSchema>;

export const ItemPriceFiltersSchema = object({
  batchNo: optional(string()),
  customerId: optional(IdSchema),
  itemId: optional(IdSchema),
  priceListId: optional(IdSchema),
  status: optional(ItemPriceStatusSchema),
  supplierId: optional(IdSchema),
  uom: optional(string()),
});

export type ItemPriceFilters = InferOutput<typeof ItemPriceFiltersSchema>;

export const ListItemPricesSchema = object({
  filters: optional(ItemPriceFiltersSchema),
  ...ListPaginationSchema.entries,
});

export type ListItemPricesInput = InferOutput<typeof ListItemPricesSchema>;

export const RateSideSchema = picklist(["selling", "buying"]);

export type RateSide = InferOutput<typeof RateSideSchema>;

export const RecordUseSchema = object({
  rate: pipe(number(), minValue(0)),
  uom: optional(nullable(string())),
});

export type RecordUseInput = InferOutput<typeof RecordUseSchema>;

export const GetRateSchema = object({
  batchNo: optional(nullable(string())),
  customerId: optional(nullable(IdSchema)),
  itemId: IdSchema,
  priceListId: optional(nullable(IdSchema)),
  priceListName: optional(nullable(string())),
  qty: pipe(
    number(),
    check((qty) => qty > 0, "qty must be greater than 0"),
  ),
  recordUse: optional(RecordUseSchema),
  side: optional(RateSideSchema),
  supplierId: optional(nullable(IdSchema)),
  txnDate: optional(nullable(date())),
  uom: optional(nullable(string())),
});

export type GetRateInput = InferOutput<typeof GetRateSchema>;

export const GetRatesForListSchema = object({
  priceListId: IdSchema,
  txnDate: optional(nullable(date())),
  ...ListPaginationSchema.entries,
});

export type GetRatesForListInput = InferOutput<typeof GetRatesForListSchema>;

export const GetActiveForItemSchema = object({
  itemId: IdSchema,
  side: optional(RateSideSchema),
  txnDate: optional(nullable(date())),
});

export type GetActiveForItemInput = InferOutput<typeof GetActiveForItemSchema>;

export const GetExpiringPricesSchema = object({
  asOf: optional(nullable(date())),
  daysAhead: pipe(number(), integer(), minValue(0)),
  ...ListPaginationSchema.entries,
});

export type GetExpiringPricesInput = InferOutput<typeof GetExpiringPricesSchema>;

export const AssignItemPriceToPartiesSchema = object({
  customerIds: optional(array(IdSchema)),
  itemId: IdSchema,
  leadTimeDays: optional(nullable(pipe(number(), integer()))),
  minQty: optional(nullable(number())),
  note: optional(nullable(string())),
  packingUnit: optional(nullable(number())),
  priceListId: IdSchema,
  rate: number(),
  supplierIds: optional(array(IdSchema)),
  uom: optional(nullable(string())),
  validFrom: optional(nullable(date())),
  validUpto: optional(nullable(date())),
});

export type AssignItemPriceToPartiesInput = InferOutput<typeof AssignItemPriceToPartiesSchema>;

export const HasPriceReferencesSchema = object({
  itemId: IdSchema,
});

export type HasPriceReferencesInput = InferOutput<typeof HasPriceReferencesSchema>;
