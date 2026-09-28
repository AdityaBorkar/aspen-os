import { DocStatusSchema, StockEntryPurposeSchema, ValuationMethodSchema } from "#/schemas/enums";
import {
  DateStringSchema,
  DocActionSchema,
  IdSchema,
  PaginationSchema,
  PositiveQuantitySchema,
  SerialNosSchema,
} from "#/schemas/utils";

import {
  array,
  boolean,
  check,
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
  serialNos: SerialNosSchema,
  sourceWarehouseId: optional(nullable(IdSchema)),
  targetWarehouseId: optional(nullable(IdSchema)),
  uom: pipe(
    string(),
    minLength(1, "UOM is required"),
    maxLength(64, "Must be at most 64 characters"),
  ),
  valuationMethod: optional(nullable(ValuationMethodSchema)),
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

export const SubmitStockEntrySchema = DocActionSchema;

export type SubmitStockEntryInput = InferOutput<typeof SubmitStockEntrySchema>;

export const CancelStockEntrySchema = DocActionSchema;

export type CancelStockEntryInput = InferOutput<typeof CancelStockEntrySchema>;

export const StockEntryFiltersSchema = object({
  ...PaginationSchema.entries,
  itemId: optional(nullable(IdSchema)),
  purpose: optional(StockEntryPurposeSchema),
  status: optional(DocStatusSchema),
  warehouseId: optional(nullable(IdSchema)),
});

export type StockEntryFiltersInput = InferOutput<typeof StockEntryFiltersSchema>;

export const StockLedgerFiltersSchema = object({
  ...PaginationSchema.entries,
  batchNo: optional(nullable(string())),
  itemId: optional(nullable(IdSchema)),
  serialNo: optional(nullable(string())),
  voucherId: optional(nullable(string())),
  warehouseId: optional(nullable(IdSchema)),
});

export type StockLedgerFiltersInput = InferOutput<typeof StockLedgerFiltersSchema>;
