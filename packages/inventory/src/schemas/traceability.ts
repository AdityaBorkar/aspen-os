import { BatchStatusSchema, SerialStatusSchema, ValuationMethodSchema } from "#/schemas/enums";
import {
  DateStringSchema,
  IdSchema,
  PaginationSchema,
  PositiveQuantitySchema,
  QuantitySchema,
} from "#/schemas/utils";

import {
  boolean,
  maxLength,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateSerialSchema = object({
  amcExpiryDate: optional(nullable(DateStringSchema)),
  batchNo: optional(nullable(string())),
  itemId: IdSchema,
  purchaseId: optional(nullable(string())),
  serialNo: pipe(
    string(),
    minLength(1, "Serial number is required"),
    maxLength(255, "Must be at most 255 characters"),
  ),
  valuationRate: optional(nullable(number())),
  warehouseId: optional(nullable(IdSchema)),
  warrantyExpiryDate: optional(nullable(DateStringSchema)),
});

export type CreateSerialInput = InferOutput<typeof CreateSerialSchema>;

export const SerialFiltersSchema = object({
  ...PaginationSchema.entries,
  batchNo: optional(nullable(string())),
  itemId: optional(nullable(IdSchema)),
  status: optional(SerialStatusSchema),
  warehouseId: optional(nullable(IdSchema)),
});

export type SerialFiltersInput = InferOutput<typeof SerialFiltersSchema>;

export const CreateBatchSchema = object({
  batchId: pipe(
    string(),
    minLength(1, "Batch ID is required"),
    maxLength(255, "Must be at most 255 characters"),
  ),
  expiryDate: optional(nullable(DateStringSchema)),
  itemId: IdSchema,
  manufacturingDate: optional(nullable(DateStringSchema)),
  supplierId: optional(nullable(string())),
});

export type CreateBatchInput = InferOutput<typeof CreateBatchSchema>;

export const UpdateBatchSchema = object({
  expiryDate: optional(nullable(DateStringSchema)),
  manufacturingDate: optional(nullable(DateStringSchema)),
  status: optional(BatchStatusSchema),
  supplierId: optional(nullable(string())),
});

export type UpdateBatchInput = InferOutput<typeof UpdateBatchSchema>;

export const SplitBatchSchema = object({
  id: IdSchema,
  newBatchId: pipe(string(), minLength(1, "New batch ID is required")),
  qty: optional(nullable(number())),
  targetWarehouseId: optional(nullable(IdSchema)),
});

export type SplitBatchInput = InferOutput<typeof SplitBatchSchema>;

export const MoveBatchSchema = object({
  batchNo: pipe(string(), minLength(1, "Batch number is required")),
  itemId: IdSchema,
  qty: QuantitySchema,
  sourceWarehouseId: IdSchema,
  targetWarehouseId: IdSchema,
});

export type MoveBatchInput = InferOutput<typeof MoveBatchSchema>;

export const BatchFiltersSchema = object({
  ...PaginationSchema.entries,
  itemId: optional(nullable(IdSchema)),
  status: optional(BatchStatusSchema),
});

export type BatchFiltersInput = InferOutput<typeof BatchFiltersSchema>;

export const ExpiringBatchesSchema = object({
  daysAhead: optional(PositiveQuantitySchema, 30),
});

export type ExpiringBatchesInput = InferOutput<typeof ExpiringBatchesSchema>;

export const UpdateSettingSchema = object({
  allowEditStockUomQty: optional(boolean()),
  allowNegativeStock: optional(boolean()),
  autoInsertPriceIfMissing: optional(boolean()),
  autoReserveOnPurchase: optional(boolean()),
  batchNamingSeries: optional(nullable(string())),
  cleanDescriptionHtml: optional(boolean()),
  defaultValuationMethod: optional(ValuationMethodSchema),
  defaultWarehouseId: optional(nullable(IdSchema)),
  enableSerialBatch: optional(boolean()),
  enableStockReservation: optional(boolean()),
  freezeAllowedRole: optional(nullable(string())),
  freezeOlderThanDays: optional(nullable(PositiveQuantitySchema)),
  freezeUptoDate: optional(nullable(DateStringSchema)),
  limitPercent: optional(nullable(number())),
  overDeliverReceiveRole: optional(nullable(string())),
  sampleRetentionWarehouseId: optional(nullable(IdSchema)),
  showBarcodeField: optional(boolean()),
  stockUomDefault: optional(nullable(string())),
  uomRestrictToItemConversions: optional(boolean()),
});

export type UpdateSettingInput = InferOutput<typeof UpdateSettingSchema>;

export const ReorderScanSchema = object({
  dryRun: optional(boolean(), false),
});

export type ReorderScanInput = InferOutput<typeof ReorderScanSchema>;
