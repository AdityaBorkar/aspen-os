import { DrugAdminStatusSchema, TaskStatusSchema } from "#/schemas/enums";
import { BranchIdSchema, PaginationSchema } from "#/schemas/utils";

import {
  array,
  maxLength,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const Id = pipe(string(), minLength(1, "ID is required"));

const CreateNursingTaskSchema = object({
  branchId: BranchIdSchema,
  dueAt: optional(string()),
  encounterId: optional(string()),
  kind: optional(string(), "general"),
  orderId: optional(string()),
  patientId: Id,
  title: pipe(string(), minLength(1, "Title is required")),
});

const UpdateNursingTaskSchema = object({
  status: TaskStatusSchema,
  taskId: Id,
});

const NursingTaskFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
  status: optional(TaskStatusSchema),
});

const TasksFromOrdersSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  patientId: optional(string()),
});

const CreateNursingNoteSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  note: pipe(string(), minLength(1, "Note is required")),
  patientId: Id,
  recordedBy: optional(string()),
});

const NursingNoteFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const RecordVitalsSchema = object({
  bpDia: optional(number()),
  bpSys: optional(number()),
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  note: optional(string()),
  patientId: Id,
  pulse: optional(number()),
  rr: optional(number()),
  spo2: optional(number()),
  temp: optional(number()),
});

const VitalsFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const RecordIoSchema = object({
  branchId: BranchIdSchema,
  intakeMl: optional(pipe(number(), minValue(0))),
  note: optional(string()),
  outputMl: optional(pipe(number(), minValue(0))),
  patientId: Id,
});

const IoFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const RecordPainSchema = object({
  branchId: BranchIdSchema,
  note: optional(string()),
  patientId: Id,
  phase: picklist(["post", "pre"]),
  score: pipe(number(), minValue(0), maxValue(10)),
});

const PainFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const RecordRiskScreenSchema = object({
  branchId: BranchIdSchema,
  kind: picklist(["Braden", "MNA", "Morse"]),
  patientId: Id,
  score: number(),
  screenedBy: Id,
});

const RiskScreenFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const AdministerDrugSchema = object({
  allergies: optional(array(string())),
  batchId: optional(pipe(string(), minLength(1))),
  branchId: BranchIdSchema,
  doctorOverrideId: optional(string()),
  dose: pipe(string(), minLength(1, "Dose is required")),
  drug: pipe(string(), minLength(1, "Drug name is required")),
  note: optional(string()),
  orderId: optional(string()),
  outcome: picklist(["Given", "Held", "Missed", "Refused"]),
  patientId: Id,
  route: optional(pipe(string(), maxLength(50))),
  witness: optional(string()),
});

const DrugAdminFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  outcome: optional(DrugAdminStatusSchema),
  patientId: optional(string()),
});

const NursingConsumableSchema = object({
  item: pipe(string(), minLength(1)),
  qty: pipe(number(), minValue(1)),
});

const RecordSittingSchema = object({
  branchId: BranchIdSchema,
  consentId: Id,
  consumables: optional(array(NursingConsumableSchema)),
  note: optional(string()),
  patientId: Id,
  phase: picklist(["post", "pre"]),
  vitals: optional(
    object({
      bpDia: optional(number()),
      bpSys: optional(number()),
      pulse: optional(number()),
      spo2: optional(number()),
      temp: optional(number()),
    }),
  ),
});

const SittingFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const RecordHandoverSchema = object({
  branchId: BranchIdSchema,
  fromShift: picklist(["evening", "morning", "night"]),
  notes: pipe(string(), minLength(1, "Handover notes are required")),
  status: picklist(["draft", "signed"]),
  toShift: picklist(["evening", "morning", "night"]),
});

const HandoverFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  status: optional(picklist(["draft", "signed"])),
});

const RecordChecklistSchema = object({
  branchId: BranchIdSchema,
  items: array(
    object({
      done: picklist(["na", "no", "yes"]),
      label: pipe(string(), minLength(1)),
    }),
  ),
  kind: optional(picklist(["discharge", "general", "transfer"])),
  name: pipe(string(), minLength(1, "Checklist name is required")),
  patientId: optional(string()),
});

const ChecklistFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const RecordTriageTagSchema = object({
  branchId: BranchIdSchema,
  patientId: Id,
  reason: pipe(string(), minLength(1, "Triage reason is required")),
  tag: picklist(["green", "red", "yellow"]),
});

const TriageTagFiltersSchema = object({
  ...PaginationSchema.entries,
  branchId: BranchIdSchema,
  patientId: optional(string()),
});

const NursingBoardSchema = object({
  branchId: BranchIdSchema,
});

const NursingPatientRefSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(string()),
  patientId: Id,
});

type CreateNursingTaskInput = InferOutput<typeof CreateNursingTaskSchema>;
type UpdateNursingTaskInput = InferOutput<typeof UpdateNursingTaskSchema>;
type NursingTaskFilters = InferOutput<typeof NursingTaskFiltersSchema>;
type TasksFromOrdersInput = InferOutput<typeof TasksFromOrdersSchema>;
type CreateNursingNoteInput = InferOutput<typeof CreateNursingNoteSchema>;
type NursingNoteFilters = InferOutput<typeof NursingNoteFiltersSchema>;
type RecordVitalsInput = InferOutput<typeof RecordVitalsSchema>;
type VitalsFilters = InferOutput<typeof VitalsFiltersSchema>;
type RecordIoInput = InferOutput<typeof RecordIoSchema>;
type IoFilters = InferOutput<typeof IoFiltersSchema>;
type RecordPainInput = InferOutput<typeof RecordPainSchema>;
type PainFilters = InferOutput<typeof PainFiltersSchema>;
type RecordRiskScreenInput = InferOutput<typeof RecordRiskScreenSchema>;
type RiskScreenFilters = InferOutput<typeof RiskScreenFiltersSchema>;
type AdministerDrugInput = InferOutput<typeof AdministerDrugSchema>;
type DrugAdminFilters = InferOutput<typeof DrugAdminFiltersSchema>;
type RecordSittingInput = InferOutput<typeof RecordSittingSchema>;
type SittingFilters = InferOutput<typeof SittingFiltersSchema>;
type RecordHandoverInput = InferOutput<typeof RecordHandoverSchema>;
type HandoverFilters = InferOutput<typeof HandoverFiltersSchema>;
type RecordChecklistInput = InferOutput<typeof RecordChecklistSchema>;
type ChecklistFilters = InferOutput<typeof ChecklistFiltersSchema>;
type RecordTriageTagInput = InferOutput<typeof RecordTriageTagSchema>;
type TriageTagFilters = InferOutput<typeof TriageTagFiltersSchema>;
type NursingBoardInput = InferOutput<typeof NursingBoardSchema>;
type NursingPatientRef = InferOutput<typeof NursingPatientRefSchema>;

export {
  AdministerDrugSchema,
  ChecklistFiltersSchema,
  CreateNursingNoteSchema,
  CreateNursingTaskSchema,
  DrugAdminFiltersSchema,
  HandoverFiltersSchema,
  IoFiltersSchema,
  NursingBoardSchema,
  NursingConsumableSchema,
  NursingNoteFiltersSchema,
  NursingPatientRefSchema,
  NursingTaskFiltersSchema,
  PainFiltersSchema,
  RecordChecklistSchema,
  RecordHandoverSchema,
  RecordIoSchema,
  RecordPainSchema,
  RecordRiskScreenSchema,
  RecordSittingSchema,
  RecordTriageTagSchema,
  RecordVitalsSchema,
  RiskScreenFiltersSchema,
  SittingFiltersSchema,
  TasksFromOrdersSchema,
  TriageTagFiltersSchema,
  UpdateNursingTaskSchema,
  VitalsFiltersSchema,
};

export type {
  AdministerDrugInput,
  ChecklistFilters,
  CreateNursingNoteInput,
  CreateNursingTaskInput,
  DrugAdminFilters,
  HandoverFilters,
  IoFilters,
  NursingBoardInput,
  NursingNoteFilters,
  NursingPatientRef,
  NursingTaskFilters,
  PainFilters,
  RecordChecklistInput,
  RecordHandoverInput,
  RecordIoInput,
  RecordPainInput,
  RecordRiskScreenInput,
  RecordSittingInput,
  RecordTriageTagInput,
  RecordVitalsInput,
  RiskScreenFilters,
  SittingFilters,
  TasksFromOrdersInput,
  TriageTagFilters,
  UpdateNursingTaskInput,
  VitalsFilters,
};
