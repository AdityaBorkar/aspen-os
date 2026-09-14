import { BranchIdSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  integer,
  minLength,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const EncounterId = pipe(string(), minLength(1, "Encounter ID is required"));

export const EncounterSpecialtySchema = picklist([
  "allopathy",
  "dental",
  "ayush",
  "physio",
  "speech",
  "psych",
]);

export type EncounterSpecialty = InferOutput<typeof EncounterSpecialtySchema>;

export const EncounterVisitTypeSchema = picklist(["new", "followup", "casualty", "tele"]);

export type EncounterVisitType = InferOutput<typeof EncounterVisitTypeSchema>;

export const CreateEncounterSchema = object({
  appointmentId: optional(string()),
  branchId: BranchIdSchema,
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  specialty: EncounterSpecialtySchema,
  visitType: EncounterVisitTypeSchema,
});

export type CreateEncounterInput = InferOutput<typeof CreateEncounterSchema>;

export const EncounterIdSchema = object({ id: EncounterId });

export type EncounterIdInput = InferOutput<typeof EncounterIdSchema>;

export const AddDiagnosisSchema = object({
  code: pipe(string(), minLength(1, "Diagnosis code is required")),
  encounterId: EncounterId,
  kind: optional(picklist(["provisional", "confirmed"]), "provisional"),
  label: pipe(string(), minLength(1, "Diagnosis label is required")),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  primary: optional(boolean(), false),
});

export type AddDiagnosisInput = InferOutput<typeof AddDiagnosisSchema>;

export const PrescriptionItemSchema = object({
  days: pipe(number(), integer()),
  dose: pipe(string(), minLength(1, "Dose is required")),
  drug: pipe(string(), minLength(1, "Drug name is required")),
  warnings: optional(array(string())),
});

export type PrescriptionItem = InferOutput<typeof PrescriptionItemSchema>;

export const PrescribeSchema = object({
  acknowledgedWarnings: optional(array(string())),
  encounterId: EncounterId,
  items: array(PrescriptionItemSchema),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
});

export type PrescribeInput = InferOutput<typeof PrescribeSchema>;

export const RefillSchema = object({
  encounterId: EncounterId,
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  prescriptionId: pipe(string(), minLength(1, "Prescription ID is required")),
});

export type RefillInput = InferOutput<typeof RefillSchema>;

export const PlaceOrderSchema = object({
  encounterId: EncounterId,
  item: pipe(string(), minLength(1, "Order item is required")),
  kind: picklist(["lab", "radiology", "procedure", "referral", "nursing"]),
  note: optional(string()),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
});

export type PlaceOrderInput = InferOutput<typeof PlaceOrderSchema>;

export const RecordVitalsSchema = object({
  bp: optional(string()),
  encounterId: EncounterId,
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
  pulse: optional(pipe(number(), integer())),
  spo2: optional(pipe(number(), integer())),
  tempC: optional(number()),
  weightKg: optional(number()),
});

export type RecordVitalsInput = InferOutput<typeof RecordVitalsSchema>;

export const SetFollowUpSchema = object({
  at: pipe(string(), minLength(1, "Follow-up date is required")),
  encounterId: EncounterId,
  note: optional(string()),
  patientId: pipe(string(), minLength(1, "Patient ID is required")),
});

export type SetFollowUpInput = InferOutput<typeof SetFollowUpSchema>;

export const AddEncounterAddendumSchema = object({
  encounterId: EncounterId,
  note: pipe(string(), minLength(1, "Addendum note is required")),
});

export type AddEncounterAddendumInput = InferOutput<typeof AddEncounterAddendumSchema>;

export const UpdateEncounterSchema = object({
  id: EncounterId,
  patch: object({
    appointmentId: optional(string()),
    specialty: optional(EncounterSpecialtySchema),
    visitType: optional(EncounterVisitTypeSchema),
  }),
});

export type UpdateEncounterInput = InferOutput<typeof UpdateEncounterSchema>;

export const EncounterFiltersSchema = object({
  appointmentId: optional(string()),
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(string()),
  specialty: optional(string()),
  status: optional(string()),
});

export type EncounterFiltersInput = InferOutput<typeof EncounterFiltersSchema>;
