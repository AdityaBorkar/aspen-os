import {
  DocStatusSchema,
  PickListPurposeSchema,
  ReconcileModeSchema,
  ReconciliationPurposeSchema,
  ReservationStatusSchema,
} from "#/schemas/enums";
import {
  DateStringSchema,
  IdSchema,
  PositiveQuantitySchema,
  QuantitySchema,
} from "#/schemas/utils";

import {
  array,
  boolean,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const ReconciliationItemSchema = object({
  batchNo: optional(nullable(string())),
  itemId: IdSchema,
  qty: optional(nullable(QuantitySchema)),
  reconcileMode: optional(nullable(ReconcileModeSchema)),
  serialNos: optional(array(pipe(string(), minLength(1, "Serial number is required"))), []),
  valuationRate: optional(nullable(number())),
  warehouseId: IdSchema,
});

export type ReconciliationItemInput = InferOutput<typeof ReconciliationItemSchema>;

export const CreateReconciliationSchema = object({
  differenceAccount: optional(
    pipe(string(), minLength(1, "Difference account is required")),
    "Stock Adjustment",
  ),
  items: pipe(array(ReconciliationItemSchema), minLength(1, "At least one item is required")),
  postingDate: DateStringSchema,
  postingTime: optional(nullable(string())),
  purpose: ReconciliationPurposeSchema,
});

export type CreateReconciliationInput = InferOutput<typeof CreateReconciliationSchema>;

export const AddReconciliationItemsSchema = object({
  id: IdSchema,
  items: pipe(array(ReconciliationItemSchema), minLength(1, "At least one item is required")),
});

export type AddReconciliationItemsInput = InferOutput<typeof AddReconciliationItemsSchema>;

export const UpdateReconciliationSchema = object({
  differenceAccount: optional(pipe(string(), minLength(1, "Difference account is required"))),
  items: optional(array(ReconciliationItemSchema)),
  postingDate: optional(DateStringSchema),
  postingTime: optional(nullable(string())),
});

export type UpdateReconciliationInput = InferOutput<typeof UpdateReconciliationSchema>;

export const SubmitReconciliationSchema = object({
  actorRole: optional(nullable(string())),
  id: IdSchema,
});

export type SubmitReconciliationInput = InferOutput<typeof SubmitReconciliationSchema>;

export const ReconciliationFiltersSchema = object({
  limit: optional(pipe(number(), integer("Must be an integer")), 50),
  offset: optional(pipe(number(), integer("Must be an integer")), 0),
  purpose: optional(ReconciliationPurposeSchema),
  status: optional(DocStatusSchema),
});

export type ReconciliationFiltersInput = InferOutput<typeof ReconciliationFiltersSchema>;

export const CreateReservationSchema = object({
  itemId: IdSchema,
  pickListId: optional(nullable(IdSchema)),
  reservedQty: PositiveQuantitySchema,
  salesOrderId: optional(nullable(IdSchema)),
  salesOrderItemId: optional(nullable(IdSchema)),
  warehouseId: IdSchema,
});

export type CreateReservationInput = InferOutput<typeof CreateReservationSchema>;

export const ConsumeReservationSchema = object({
  id: IdSchema,
  qty: QuantitySchema,
});

export type ConsumeReservationInput = InferOutput<typeof ConsumeReservationSchema>;

export const ReservationFiltersSchema = object({
  itemId: optional(nullable(IdSchema)),
  limit: optional(pipe(number(), integer("Must be an integer")), 50),
  offset: optional(pipe(number(), integer("Must be an integer")), 0),
  salesOrderId: optional(nullable(IdSchema)),
  status: optional(ReservationStatusSchema),
  warehouseId: optional(nullable(IdSchema)),
});

export type ReservationFiltersInput = InferOutput<typeof ReservationFiltersSchema>;

export const PickListItemSchema = object({
  batchNo: optional(nullable(string())),
  itemId: IdSchema,
  materialRequestId: optional(nullable(string())),
  qty: QuantitySchema,
  salesOrderId: optional(nullable(IdSchema)),
  salesOrderItemId: optional(nullable(IdSchema)),
  serialNos: optional(array(pipe(string(), minLength(1, "Serial number is required"))), []),
  warehouseId: optional(nullable(IdSchema)),
});

export type PickListItemInput = InferOutput<typeof PickListItemSchema>;

export const CreatePickListSchema = object({
  items: pipe(array(PickListItemSchema), minLength(1, "At least one item is required")),
  parentWarehouseId: optional(nullable(IdSchema)),
  promptQty: optional(boolean(), false),
  purpose: optional(PickListPurposeSchema, "delivery"),
  scanMode: optional(boolean(), false),
});

export type CreatePickListInput = InferOutput<typeof CreatePickListSchema>;

export const UpdatePickListSchema = object({
  items: optional(array(PickListItemSchema)),
  parentWarehouseId: optional(nullable(IdSchema)),
  promptQty: optional(boolean()),
  scanMode: optional(boolean()),
});

export type UpdatePickListInput = InferOutput<typeof UpdatePickListSchema>;

export const UpdatePickedQtySchema = object({
  id: IdSchema,
  lines: pipe(
    array(
      object({
        pickItemId: IdSchema,
        pickedQty: QuantitySchema,
      }),
    ),
    minLength(1, "At least one line is required"),
  ),
});

export type UpdatePickedQtyInput = InferOutput<typeof UpdatePickedQtySchema>;

export const PickListFiltersSchema = object({
  limit: optional(pipe(number(), integer("Must be an integer")), 50),
  offset: optional(pipe(number(), integer("Must be an integer")), 0),
  purpose: optional(PickListPurposeSchema),
  status: optional(DocStatusSchema),
});

export type PickListFiltersInput = InferOutput<typeof PickListFiltersSchema>;

export const SuggestPickLocationsSchema = object({
  items: pipe(
    array(
      object({
        batchNo: optional(nullable(string())),
        itemId: IdSchema,
        qty: PositiveQuantitySchema,
      }),
    ),
    minLength(1, "At least one item is required"),
  ),
  parentWarehouseId: optional(nullable(IdSchema)),
});

export type SuggestPickLocationsInput = InferOutput<typeof SuggestPickLocationsSchema>;

export const ReleaseReservationsSchema = object({
  ids: pipe(array(IdSchema), minLength(1, "At least one reservation is required")),
});

export type ReleaseReservationsInput = InferOutput<typeof ReleaseReservationsSchema>;

export const CreatePutawayRuleSchema = object({
  capacity: QuantitySchema,
  capacityUom: pipe(string(), minLength(1, "Capacity UOM is required")),
  itemId: IdSchema,
  priority: optional(pipe(number(), integer("Must be an integer")), 1),
  warehouseId: IdSchema,
});

export type CreatePutawayRuleInput = InferOutput<typeof CreatePutawayRuleSchema>;

export const UpdatePutawayRuleSchema = object({
  capacity: optional(QuantitySchema),
  capacityUom: optional(pipe(string(), minLength(1, "Capacity UOM is required"))),
  isDisabled: optional(boolean()),
  priority: optional(pipe(number(), integer("Must be an integer"))),
});

export type UpdatePutawayRuleInput = InferOutput<typeof UpdatePutawayRuleSchema>;

export const PutawayRuleFiltersSchema = object({
  includeDisabled: optional(boolean(), false),
  itemId: optional(nullable(IdSchema)),
  limit: optional(pipe(number(), integer("Must be an integer")), 50),
  offset: optional(pipe(number(), integer("Must be an integer")), 0),
  warehouseId: optional(nullable(IdSchema)),
});

export type PutawayRuleFiltersInput = InferOutput<typeof PutawayRuleFiltersSchema>;
