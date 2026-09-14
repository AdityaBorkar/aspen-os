import { BranchIdSchema } from "#/schemas/utils";

import {
  array,
  integer,
  maxLength,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  optional,
  partial,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const RequiredText = (label: string) => pipe(string(), minLength(1, `${label} is required`));

const DiagnosisEntrySchema = object({
  code: RequiredText("Diagnosis code"),
  label: optional(pipe(string(), maxLength(500))),
  system: picklist(["ICD11", "TM2", "NAMASTE"]),
});

const CreateSoapNoteSchema = object({
  assessment: RequiredText("Assessment"),
  branchId: BranchIdSchema,
  diagnoses: pipe(
    array(DiagnosisEntrySchema),
    minLength(1, "At least one diagnosis is required before prescribing"),
  ),
  encounterId: RequiredText("Encounter"),
  objective: RequiredText("Objective"),
  patientId: RequiredText("Patient"),
  plan: RequiredText("Plan"),
  subjective: RequiredText("Subjective"),
});

const UpdateSoapNoteSchema = partial(CreateSoapNoteSchema);

const CreateExamFindingSchema = object({
  branchId: BranchIdSchema,
  encounterId: RequiredText("Encounter"),
  finding: RequiredText("Finding"),
  patientId: RequiredText("Patient"),
  severity: optional(picklist(["mild", "moderate", "severe"])),
  system: picklist([
    "general",
    "cvs",
    "rs",
    "cns",
    "abdomen",
    "ent",
    "eye",
    "skin",
    "mskus",
    "other",
  ]),
});

const UpdateExamFindingSchema = partial(CreateExamFindingSchema);

const CreateChronicLogSchema = object({
  branchId: BranchIdSchema,
  condition: picklist([
    "diabetes",
    "hypertension",
    "asthma",
    "copd",
    "epilepsy",
    "ckd",
    "thyroid",
    "other",
  ]),
  encounterId: optional(pipe(string(), minLength(1))),
  parameter: RequiredText("Parameter"),
  patientId: RequiredText("Patient"),
  unit: RequiredText("Unit"),
  value: number("Value must be a number"),
});

const UpdateChronicLogSchema = partial(CreateChronicLogSchema);

const CreateImmunizationSchema = object({
  branchId: BranchIdSchema,
  doseNo: pipe(number(), minValue(1, "Dose number must be at least 1")),
  dueDate: optional(pipe(string(), minLength(1))),
  givenAt: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  status: picklist(["Due", "Given", "Overdue"]),
  vaccine: RequiredText("Vaccine"),
});

const UpdateImmunizationSchema = partial(CreateImmunizationSchema);

const CreateRegisterEntrySchema = object({
  branchId: BranchIdSchema,
  diagnoses: optional(array(DiagnosisEntrySchema)),
  encounterId: optional(pipe(string(), minLength(1))),
  notes: optional(pipe(string(), maxLength(2000))),
  patientId: RequiredText("Patient"),
  registerType: picklist(["opd", "casualty", "tele", "followup"]),
  status: picklist(["Draft", "Final"]),
});

const UpdateRegisterEntrySchema = partial(CreateRegisterEntrySchema);

const CreateTriageEntrySchema = object({
  bpDys: optional(pipe(number(), minValue(0), maxValue(300))),
  bpSys: optional(pipe(number(), minValue(0), maxValue(400))),
  branchId: BranchIdSchema,
  encounterId: optional(pipe(string(), minLength(1))),
  painScore: optional(pipe(number(), minValue(0), maxValue(10))),
  patientId: RequiredText("Patient"),
  priority: picklist(["routine", "urgent", "emergency"]),
  pulse: optional(pipe(number(), minValue(0), maxValue(300))),
  rr: optional(pipe(number(), minValue(0), maxValue(120))),
  spo2: optional(pipe(number(), minValue(0), maxValue(100))),
  tempC: optional(pipe(number(), minValue(25), maxValue(46))),
});

const UpdateTriageEntrySchema = partial(CreateTriageEntrySchema);

const SoapNoteFiltersSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(pipe(string(), minLength(1))),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
});

const AllopathyFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
});

export {
  AllopathyFiltersSchema,
  CreateChronicLogSchema,
  CreateExamFindingSchema,
  CreateImmunizationSchema,
  CreateRegisterEntrySchema,
  CreateSoapNoteSchema,
  CreateTriageEntrySchema,
  DiagnosisEntrySchema,
  SoapNoteFiltersSchema,
  UpdateChronicLogSchema,
  UpdateExamFindingSchema,
  UpdateImmunizationSchema,
  UpdateRegisterEntrySchema,
  UpdateSoapNoteSchema,
  UpdateTriageEntrySchema,
};

export type {
  AllopathyFiltersInput as AllopathyFilters,
  ChronicLogInput as CreateChronicLogInput,
  ExamFindingInput as CreateExamFindingInput,
  ImmunizationInput as CreateImmunizationInput,
  RegisterEntryInput as CreateRegisterEntryInput,
  SoapNoteFiltersInput as SoapNoteFilters,
  SoapNoteInput as CreateSoapNoteInput,
  TriageEntryInput as CreateTriageEntryInput,
  UpdateChronicLogInput,
  UpdateExamFindingInput,
  UpdateImmunizationInput,
  UpdateRegisterEntryInput,
  UpdateSoapNoteInput,
  UpdateTriageEntryInput,
};

type SoapNoteInput = InferOutput<typeof CreateSoapNoteSchema>;
type UpdateSoapNoteInput = InferOutput<typeof UpdateSoapNoteSchema>;
type ExamFindingInput = InferOutput<typeof CreateExamFindingSchema>;
type UpdateExamFindingInput = InferOutput<typeof UpdateExamFindingSchema>;
type ChronicLogInput = InferOutput<typeof CreateChronicLogSchema>;
type UpdateChronicLogInput = InferOutput<typeof UpdateChronicLogSchema>;
type ImmunizationInput = InferOutput<typeof CreateImmunizationSchema>;
type UpdateImmunizationInput = InferOutput<typeof UpdateImmunizationSchema>;
type RegisterEntryInput = InferOutput<typeof CreateRegisterEntrySchema>;
type UpdateRegisterEntryInput = InferOutput<typeof UpdateRegisterEntrySchema>;
type TriageEntryInput = InferOutput<typeof CreateTriageEntrySchema>;
type UpdateTriageEntryInput = InferOutput<typeof UpdateTriageEntrySchema>;
type SoapNoteFiltersInput = InferOutput<typeof SoapNoteFiltersSchema>;
type AllopathyFiltersInput = InferOutput<typeof AllopathyFiltersSchema>;
