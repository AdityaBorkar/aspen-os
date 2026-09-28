import { DocStatusSchema, StockEntryPurposeSchema } from "#/schemas/enums";
import { DateStringSchema, IdSchema, PositiveQuantitySchema } from "#/schemas/utils";

import {
  array,
  boolean,
  check,
  integer,
  maxLength,
  minLength,
  nullable,
  nullish,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const StockEntryItemSchema = object({
  allowNegativeStock: optional(nullable(boolean())),
  basicRate: optional(nullable(number())),
  batchNo: optional(nullable(string())),
  conversionFactor: optional(
    pipe(
      number(),
      check((value) => Number.isFinite(value) && value > 0, "Must be greater than zero"),
    ),
    1,
  ),
  itemId: IdSchema,
  qty: PositiveQuantitySchema,
  requiresBatch: optional(nullable(boolean())),
  requiresSerial: optional(nullable(boolean())),
  salesOrderId: optional(nullable(IdSchema)),
  salesOrderItemId: optional(nullable(IdSchema)),
  sampleQty: optional(
    pipe(
      number(),
      check((value) => Number.isFinite(value) && value >= 0, "Must be zero or greater"),
    ),
    0,
  ),
  serialNos: optional(array(pipe(string(), minLength(1, "Serial number is required"))), []),
  sourceWarehouseId: optional(nullable(IdSchema)),
  targetWarehouseId: optional(nullable(IdSchema)),
  uom: pipe(
    string(),
    minLength(1, "UOM is required"),
    maxLength(64, "Must be at most 64 characters"),
  ),
  valuationMethod: optional(nullable(pipe(string(), minLength(1, "Valuation method is required")))),
});

export type StockEntryItemInput = InferOutput<typeof StockEntryItemSchema>;

export const AdditionalCostSchema = object({
  amount: pipe(
    number(),
    check((value) => Number.isFinite(value) && value >= 0, "Must be zero or greater"),
  ),
  description: optional(nullable(string())),
  expenseAccount: pipe(string(), minLength(1, "Expense account is required")),
});

export type AdditionalCostInput = InferOutput<typeof AdditionalCostSchema>;

export const CreateStockEntrySchema = object({
  addToTransit: optional(boolean(), false),
  additionalCosts: optional(array(AdditionalCostSchema), []),
  allowZeroValuation: optional(boolean(), false),
  applyPutawayRule: optional(boolean(), false),
  inspectionRequired: optional(boolean(), false),
  isOpening: optional(boolean(), false),
  items: pipe(array(StockEntryItemSchema), minLength(1, "At least one item is required")),
  partyId: optional(nullable(string())),
  postingDate: DateStringSchema,
  postingTime: optional(nullable(string())),
  purpose: StockEntryPurposeSchema,
  sourceWarehouseId: optional(nullable(IdSchema)),
  targetWarehouseId: optional(nullable(IdSchema)),
  workOrderId: optional(nullable(string())),
});

export type CreateStockEntryInput = InferOutput<typeof CreateStockEntrySchema>;

export const UpdateStockEntrySchema = object({
  addToTransit: optional(boolean()),
  additionalCosts: optional(array(AdditionalCostSchema)),
  allowZeroValuation: optional(boolean()),
  applyPutawayRule: optional(boolean()),
  inspectionRequired: optional(boolean()),
  isOpening: optional(boolean()),
  items: optional(array(StockEntryItemSchema)),
  partyId: optional(nullable(string())),
  postingDate: optional(DateStringSchema),
  postingTime: optional(nullable(string())),
  sourceWarehouseId: nullish(IdSchema),
  targetWarehouseId: nullish(IdSchema),
  workOrderId: optional(nullable(string())),
});

export type UpdateStockEntryInput = InferOutput<typeof UpdateStockEntrySchema>;

export const SubmitStockEntrySchema = object({
  actorRole: optional(nullable(string())),
  id: IdSchema,
});

export type SubmitStockEntryInput = InferOutput<typeof SubmitStockEntrySchema>;

export const CancelStockEntrySchema = object({
  actorRole: optional(nullable(string())),
  id: IdSchema,
});

export type CancelStockEntryInput = InferOutput<typeof CancelStockEntrySchema>;

export const StockEntryFiltersSchema = object({
  itemId: optional(nullable(IdSchema)),
  limit: optional(pipe(number(), integer("Must be an integer")), 50),
  offset: optional(pipe(number(), integer("Must be an integer")), 0),
  purpose: optional(StockEntryPurposeSchema),
  status: optional(DocStatusSchema),
  warehouseId: optional(nullable(IdSchema)),
});

export type StockEntryFiltersInput = InferOutput<typeof StockEntryFiltersSchema>;

export const StockLedgerFiltersSchema = object({
  batchNo: optional(nullable(string())),
  itemId: optional(nullable(IdSchema)),
  limit: optional(pipe(number(), integer("Must be an integer")), 50),
  offset: optional(pipe(number(), integer("Must be an integer")), 0),
  serialNo: optional(nullable(string())),
  voucherId: optional(nullable(string())),
  warehouseId: optional(nullable(IdSchema)),
});

export type StockLedgerFiltersInput = InferOutput<typeof StockLedgerFiltersSchema>;
