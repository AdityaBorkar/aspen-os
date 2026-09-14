import { BranchIdSchema } from "#/schemas/utils";

import { boolean, integer, minLength, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

const AppointmentId = pipe(string(), minLength(1, "Appointment ID is required"));

export const BookAppointmentSchema = object({
  branchId: BranchIdSchema,
  daycare: optional(boolean(), false),
  durationMin: optional(pipe(number(), integer())),
  facilityId: optional(string()),
  note: optional(string()),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  practitionerId: pipe(string(), minLength(1, "Practitioner ID is required")),
  pricelist: optional(string(), "standard"),
  serviceId: optional(string()),
  slotStart: pipe(string(), minLength(1, "Slot start is required")),
});

export type BookAppointmentInput = InferOutput<typeof BookAppointmentSchema>;

export const AppointmentIdSchema = object({ id: AppointmentId });

export type AppointmentIdInput = InferOutput<typeof AppointmentIdSchema>;

export const RescheduleAppointmentSchema = object({
  id: AppointmentId,
  reason: pipe(string(), minLength(1, "Reschedule reason is required")),
  slotStart: pipe(string(), minLength(1, "New slot start is required")),
});

export type RescheduleAppointmentInput = InferOutput<typeof RescheduleAppointmentSchema>;

export const CancelAppointmentSchema = object({
  id: AppointmentId,
  reason: pipe(string(), minLength(1, "Cancel reason is required")),
});

export type CancelAppointmentInput = InferOutput<typeof CancelAppointmentSchema>;

export const ComputeSlotsSchema = object({
  branchId: BranchIdSchema,
  date: pipe(string(), minLength(1, "Date is required")),
  facilityId: optional(string()),
  practitionerId: pipe(string(), minLength(1, "Practitioner ID is required")),
});

export type ComputeSlotsInput = InferOutput<typeof ComputeSlotsSchema>;

export const QueueQuerySchema = object({ branchId: BranchIdSchema });

export type QueueQueryInput = InferOutput<typeof QueueQuerySchema>;

export const WalkinTokenSchema = object({
  branchId: BranchIdSchema,
  facilityId: optional(string()),
  patientId: optional(string()),
  practitionerId: optional(string()),
  walkin: optional(boolean(), false),
});

export type WalkinTokenInput = InferOutput<typeof WalkinTokenSchema>;

export const CallNextSchema = object({
  branchId: BranchIdSchema,
  practitionerId: optional(string()),
});

export type CallNextInput = InferOutput<typeof CallNextSchema>;

export const BookVideoSchema = object({
  branchId: BranchIdSchema,
  note: optional(string()),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  practitionerId: pipe(string(), minLength(1, "Practitioner ID is required")),
  slotStart: pipe(string(), minLength(1, "Slot start is required")),
});

export type BookVideoInput = InferOutput<typeof BookVideoSchema>;

export const CaptureConsentSchema = object({
  appointmentId: AppointmentId,
  granted: boolean(),
  note: optional(string()),
});

export type CaptureConsentInput = InferOutput<typeof CaptureConsentSchema>;

export const IssueRecallSchema = object({
  at: pipe(string(), minLength(1, "Recall date is required")),
  branchId: BranchIdSchema,
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  reason: pipe(string(), minLength(1, "Recall reason is required")),
});

export type IssueRecallInput = InferOutput<typeof IssueRecallSchema>;

export const IssueCertificateSchema = object({
  appointmentId: AppointmentId,
  body: pipe(string(), minLength(1, "Certificate body is required")),
  branchId: BranchIdSchema,
  type: pipe(string(), minLength(1, "Certificate type is required")),
});

export type IssueCertificateInput = InferOutput<typeof IssueCertificateSchema>;

export const CreateAppointmentSchema = BookAppointmentSchema;

export type CreateAppointmentInput = InferOutput<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = object({
  id: AppointmentId,
  patch: object({
    daycare: optional(boolean()),
    durationMin: optional(pipe(number(), integer())),
    facilityId: optional(string()),
    note: optional(string()),
    pricelist: optional(string()),
    serviceId: optional(string()),
    tele: optional(boolean()),
  }),
});

export type UpdateAppointmentInput = InferOutput<typeof UpdateAppointmentSchema>;

export const AppointmentFiltersSchema = object({
  branchId: BranchIdSchema,
  date: optional(string()),
  facilityId: optional(string()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(string()),
  practitionerId: optional(string()),
  status: optional(string()),
});

export type AppointmentFiltersInput = InferOutput<typeof AppointmentFiltersSchema>;

export const QueueTokenFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  practitionerId: optional(string()),
  status: optional(string()),
});

export type QueueTokenFiltersInput = InferOutput<typeof QueueTokenFiltersSchema>;

export const SlotSchema = object({
  reserved: optional(boolean(), false),
  slotStart: string(),
  taken: boolean(),
});

export type Slot = InferOutput<typeof SlotSchema>;

export { AppointmentFiltersSchema as AppointmentListSchema };

export const VideoSessionFiltersSchema = object({
  appointmentId: optional(string()),
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type VideoSessionFiltersInput = InferOutput<typeof VideoSessionFiltersSchema>;

export const CertificateFiltersSchema = object({
  appointmentId: optional(string()),
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(string()),
});

export type CertificateFiltersInput = InferOutput<typeof CertificateFiltersSchema>;

export const RecallListSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(string()),
});

export type RecallListInput = InferOutput<typeof RecallListSchema>;
