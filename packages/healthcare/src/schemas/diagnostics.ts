import { LabOrderStatusSchema, RadioOrderStatusSchema } from "#/schemas/enums";
import { BranchIdSchema, PaginationSchema } from "#/schemas/utils";

import type { InferOutput } from "valibot";
import {
  array,
  boolean,
  integer,
  minLength,
  nullable,
  number,
  object,
  optional,
  partial,
  picklist,
  pipe,
  string,
} from "valibot";

const Id = pipe(string(), minLength(1, "ID is required"));

const ReferenceRangeSchema = object({
  ageMax: optional(number()),
  ageMin: optional(number()),
  high: number(),
  low: number(),
  sex: optional(picklist(["M", "F", "any"])),
});

export const TestMasterSchema = object({
  active: optional(boolean()),
  branchId: BranchIdSchema,
  code: pipe(string(), minLength(1, "Test code is required")),
  method: optional(string()),
  name: pipe(string(), minLength(1, "Test name is required")),
  price: optional(number()),
  ranges: optional(array(ReferenceRangeSchema)),
  refHigh: optional(number()),
  refLow: optional(number()),
  specimen: optional(string()),
  turnaroundHrs: optional(number()),
  units: optional(string()),
});

export const PanelSchema = object({
  branchId: BranchIdSchema,
  name: pipe(string(), minLength(1, "Panel name is required")),
  testIds: array(Id),
});

export const OrderLabsSchema = object({
  branchId: BranchIdSchema,
  dx: optional(string()),
  encounterId: optional(string()),
  patientId: Id,
  payer: optional(string()),
  priority: picklist(["routine", "urgent", "stat"]),
  tests: array(Id),
});

export const SampleCollectSchema = object({
  barcode: pipe(string(), minLength(1, "Barcode is required")),
  branchId: BranchIdSchema,
  collectedAt: optional(string()),
  collectedBy: Id,
  orderId: Id,
});

export const SampleReceiveSchema = object({
  barcode: pipe(string(), minLength(1, "Barcode is required")),
  branchId: BranchIdSchema,
  condition: optional(picklist(["ok", "hemolysed", "insufficient", "clotted", "mislabeled"])),
  receivedAt: optional(string()),
  receivedBy: Id,
});

export const SampleRejectSchema = object({
  barcode: pipe(string(), minLength(1, "Barcode is required")),
  branchId: BranchIdSchema,
  note: optional(string()),
  reason: picklist(["hemolysed", "insufficient", "clotted", "mislabeled", "other"]),
  rejectedBy: Id,
});

export const AddOnTestSchema = object({
  branchId: BranchIdSchema,
  orderId: Id,
  requestedBy: Id,
  tests: array(Id),
});

export const TatReportSchema = object({
  branchId: BranchIdSchema,
  from: optional(string()),
  limit: optional(pipe(number(), integer())),
  to: optional(string()),
});

export const ResultEntrySchema = object({
  branchId: BranchIdSchema,
  enteredBy: Id,
  flag: optional(picklist(["normal", "L", "H", "critical"])),
  orderId: Id,
  testCode: Id,
  value: pipe(string(), minLength(1, "Result value is required")),
});

export const CriticalAckSchema = object({
  ackBy: Id,
  branchId: BranchIdSchema,
  note: optional(string()),
  orderId: Id,
  testCode: Id,
});

export const AuthorizeSchema = object({
  authorizedBy: Id,
  branchId: BranchIdSchema,
  orderId: Id,
  role: pipe(string(), minLength(1, "Authorizer role is required")),
});

export const DeliverSchema = object({
  branchId: BranchIdSchema,
  channel: optional(picklist(["print", "whatsapp", "email", "portal"])),
  orderId: Id,
});

export const RadioBookSchema = object({
  branchId: BranchIdSchema,
  patientId: Id,
  referredBy: optional(string()),
  service: pipe(string(), minLength(1, "Service is required")),
  slot: pipe(string(), minLength(1, "Slot is required")),
});

export const RadioRescheduleSchema = object({
  bookingId: Id,
  branchId: BranchIdSchema,
  newSlot: pipe(string(), minLength(1, "New slot is required")),
  reason: optional(string()),
  supervisorOverrideBy: optional(string()),
});

export const RadioCheckinSchema = object({
  bookingId: Id,
  branchId: BranchIdSchema,
});

export const RadioReportAttachSchema = object({
  bookingId: Id,
  branchId: BranchIdSchema,
  impression: optional(string()),
  reportPath: pipe(string(), minLength(1, "Report path is required")),
});

export const RadioAuthorizeSchema = object({
  authorizedBy: Id,
  bookingId: Id,
  branchId: BranchIdSchema,
  version: optional(pipe(number(), integer())),
});

export const QcLogSchema = object({
  branchId: BranchIdSchema,
  deviations: optional(string()),
  equipment: pipe(string(), minLength(1, "Equipment is required")),
  loggedBy: Id,
  param: pipe(string(), minLength(1, "Parameter is required")),
  reagentLots: optional(array(string())),
  status: picklist(["pass", "flag", "fail"]),
  testFamily: optional(string()),
  value: string(),
});

export const CancelOrderSchema = object({
  bookingId: optional(string()),
  branchId: BranchIdSchema,
  cancelledBy: Id,
  orderId: optional(string()),
  reason: pipe(string(), minLength(1, "Cancel reason is required")),
});

export const DiagnosticsIdSchema = object({
  branchId: BranchIdSchema,
  id: Id,
});

export const ProcessingStartSchema = object({
  branchId: BranchIdSchema,
  orderId: Id,
  startedBy: Id,
});

export const CreateLabTestSchema = TestMasterSchema;

export const UpdateLabTestSchema = object({
  code: Id,
  name: optional(pipe(string(), minLength(1))),
  price: optional(nullable(number())),
  refHigh: optional(nullable(number())),
  refLow: optional(nullable(number())),
  specimen: optional(nullable(string())),
  turnaroundHrs: optional(nullable(number())),
});

export const LabTestFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  name: optional(string()),
  offset: optional(pipe(number(), integer())),
});

export const CreateLabPanelSchema = PanelSchema;

export const UpdateLabPanelSchema = object({
  id: Id,
  name: optional(pipe(string(), minLength(1))),
  testIds: optional(array(Id)),
});

export const LabPanelFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export const CreateLabOrderSchema = OrderLabsSchema;

export const UpdateLabOrderSchema = object({
  dx: optional(nullable(string())),
  id: Id,
  payer: optional(nullable(string())),
  priority: optional(picklist(["routine", "urgent", "stat"])),
  status: optional(LabOrderStatusSchema),
});

export const LabOrderFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(string()),
  priority: optional(picklist(["routine", "urgent", "stat"])),
  status: optional(LabOrderStatusSchema),
});

export const CreateLabSampleSchema = SampleCollectSchema;

export const UpdateLabSampleSchema = object({
  barcode: Id,
  receivedAt: optional(string()),
  status: optional(string()),
});

export const LabSampleFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  orderId: optional(string()),
});

export const CreateLabResultSchema = ResultEntrySchema;

export const LabResultFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  orderId: optional(string()),
  testCode: optional(string()),
});

export const CreateRadioBookingSchema = RadioBookSchema;

export const UpdateRadioBookingSchema = object({
  bookingNo: optional(string()),
  id: Id,
  referredBy: optional(nullable(string())),
  service: optional(pipe(string(), minLength(1))),
  slot: optional(pipe(string(), minLength(1))),
  status: optional(RadioOrderStatusSchema),
});

export const RadioBookingFiltersSchema = object({
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(string()),
  service: optional(string()),
  status: optional(RadioOrderStatusSchema),
});

export const CreateRadioReportSchema = RadioReportAttachSchema;

export const UpdateRadioReportSchema = object({
  bookingId: optional(Id),
  id: Id,
  impression: optional(nullable(string())),
  status: optional(string()),
});

export const RadioReportFiltersSchema = object({
  bookingId: optional(string()),
  branchId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export const CreateQcLogSchema = QcLogSchema;

export const QcLogFiltersSchema = object({
  branchId: optional(string()),
  equipment: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  status: optional(picklist(["pass", "fail"])),
});

export const LabTestPatchSchema = partial(UpdateLabTestSchema);
export const LabOrderPatchSchema = partial(UpdateLabOrderSchema);
export const RadioBookingPatchSchema = partial(UpdateRadioBookingSchema);

export { PaginationSchema };

export type TestMasterInput = InferOutput<typeof TestMasterSchema>;
export type ReferenceRange = InferOutput<typeof ReferenceRangeSchema>;
export type PanelInput = InferOutput<typeof PanelSchema>;
export type OrderLabsInput = InferOutput<typeof OrderLabsSchema>;
export type SampleCollectInput = InferOutput<typeof SampleCollectSchema>;
export type SampleReceiveInput = InferOutput<typeof SampleReceiveSchema>;
export type SampleRejectInput = InferOutput<typeof SampleRejectSchema>;
export type AddOnTestInput = InferOutput<typeof AddOnTestSchema>;
export type TatReportInput = InferOutput<typeof TatReportSchema>;
export type ResultEntryInput = InferOutput<typeof ResultEntrySchema>;
export type CriticalAckInput = InferOutput<typeof CriticalAckSchema>;
export type AuthorizeInput = InferOutput<typeof AuthorizeSchema>;
export type DeliverInput = InferOutput<typeof DeliverSchema>;
export type RadioBookInput = InferOutput<typeof RadioBookSchema>;
export type RadioRescheduleInput = InferOutput<typeof RadioRescheduleSchema>;
export type RadioCheckinInput = InferOutput<typeof RadioCheckinSchema>;
export type RadioReportAttachInput = InferOutput<typeof RadioReportAttachSchema>;
export type RadioAuthorizeInput = InferOutput<typeof RadioAuthorizeSchema>;
export type QcLogInput = InferOutput<typeof QcLogSchema>;
export type CancelOrderInput = InferOutput<typeof CancelOrderSchema>;
export type DiagnosticsIdInput = InferOutput<typeof DiagnosticsIdSchema>;
export type ProcessingStartInput = InferOutput<typeof ProcessingStartSchema>;
export type UpdateLabTestInput = InferOutput<typeof UpdateLabTestSchema>;
export type LabTestFilters = InferOutput<typeof LabTestFiltersSchema>;
export type UpdateLabPanelInput = InferOutput<typeof UpdateLabPanelSchema>;
export type LabPanelFilters = InferOutput<typeof LabPanelFiltersSchema>;
export type UpdateLabOrderInput = InferOutput<typeof UpdateLabOrderSchema>;
export type LabOrderFilters = InferOutput<typeof LabOrderFiltersSchema>;
export type UpdateLabSampleInput = InferOutput<typeof UpdateLabSampleSchema>;
export type LabSampleFilters = InferOutput<typeof LabSampleFiltersSchema>;
export type LabResultFilters = InferOutput<typeof LabResultFiltersSchema>;
export type UpdateRadioBookingInput = InferOutput<typeof UpdateRadioBookingSchema>;
export type RadioBookingFilters = InferOutput<typeof RadioBookingFiltersSchema>;
export type UpdateRadioReportInput = InferOutput<typeof UpdateRadioReportSchema>;
export type RadioReportFilters = InferOutput<typeof RadioReportFiltersSchema>;
export type QcLogFilters = InferOutput<typeof QcLogFiltersSchema>;
