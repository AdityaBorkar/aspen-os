import { ItemPriceStatusSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import {
  array,
  date,
  integer,
  nullable,
  nullish,
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
  status: optional(picklist(["active", "draft"]), "active"),
  supplierId: optional(nullable(IdSchema)),
  uom: optional(nullable(string())),
  validFrom: optional(nullable(date())),
  validUpto: optional(nullable(date())),
});

export type CreateItemPriceInput = InferOutput<typeof CreateItemPriceSchema>;

export const UpdateItemPriceSchema = object({
  leadTimeDays: nullish(nullable(pipe(number(), integer()))),
  minQty: nullish(nullable(number())),
  note: nullish(nullable(string())),
  packingUnit: nullish(nullable(number())),
  rate: optional(number()),
  uom: optional(string()),
  validFrom: optional(date()),
  validUpto: nullish(nullable(date())),
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
  limit: optional(number()),
  offset: optional(number()),
});

export type ListItemPricesInput = InferOutput<typeof ListItemPricesSchema>;

export const RateSideSchema = picklist(["selling", "buying"]);

export type RateSide = InferOutput<typeof RateSideSchema>;

export const RecordUseSchema = object({
  rate: number(),
  uom: optional(nullable(string())),
});

export type RecordUseInput = InferOutput<typeof RecordUseSchema>;

export const GetRateSchema = object({
  batchNo: optional(nullable(string())),
  customerId: optional(nullable(IdSchema)),
  itemId: IdSchema,
  priceListId: optional(nullable(IdSchema)),
  priceListName: optional(nullable(string())),
  qty: number(),
  recordUse: optional(RecordUseSchema),
  side: optional(RateSideSchema),
  supplierId: optional(nullable(IdSchema)),
  txnDate: optional(nullable(date())),
  uom: optional(nullable(string())),
});

export type GetRateInput = InferOutput<typeof GetRateSchema>;

export const GetRatesForListSchema = object({
  limit: optional(number()),
  offset: optional(number()),
  priceListId: IdSchema,
  txnDate: optional(nullable(date())),
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
  daysAhead: pipe(number(), integer()),
  limit: optional(number()),
  offset: optional(number()),
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
