import { BranchIdSchema } from "#/schemas/utils";

import {
  array,
  boolean,
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

const CreatePsychAssessmentSchema = object({
  branchId: BranchIdSchema,
  chiefComplaint: RequiredText("Chief complaint"),
  encounterId: RequiredText("Encounter"),
  history: RequiredText("History"),
  impression: RequiredText("Impression"),
  mentalStatusExam: RequiredText("Mental status exam"),
  patientId: RequiredText("Patient"),
});

const UpdatePsychAssessmentSchema = partial(CreatePsychAssessmentSchema);

const PsychScaleSchema = picklist([
  "PHQ9",
  "GAD7",
  "YMRS",
  "HAMD",
  "HAMA",
  "MMSE",
  "MoCA",
  "AUDIT",
  "DAST",
]);

const CreateScaleResultSchema = object({
  assessmentId: optional(pipe(string(), minLength(1))),
  branchId: BranchIdSchema,
  encounterId: RequiredText("Encounter"),
  maxScore: pipe(number(), minValue(1)),
  override: optional(boolean()),
  overrideReason: optional(pipe(string(), maxLength(1000))),
  patientId: RequiredText("Patient"),
  scale: PsychScaleSchema,
  score: pipe(number("Score must be a number"), minValue(0)),
});

const CreateRiskScreenSchema = object({
  branchId: BranchIdSchema,
  encounterId: RequiredText("Encounter"),
  factors: pipe(
    array(RequiredText("Risk factor")),
    minLength(1, "Record at least one risk factor"),
  ),
  level: picklist(["Low", "Moderate", "High"]),
  patientId: RequiredText("Patient"),
});

const CreateSafetyPlanSchema = object({
  branchId: BranchIdSchema,
  contacts: pipe(
    array(RequiredText("Contact")),
    minLength(1, "Add at least one emergency contact"),
  ),
  copingStrategies: RequiredText("Coping strategies"),
  encounterId: RequiredText("Encounter"),
  meansRestriction: RequiredText("Means restriction"),
  patientId: RequiredText("Patient"),
  warningSigns: RequiredText("Warning signs"),
});

const CreateSeniorAlertSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  reason: RequiredText("Reason"),
});

const BookCounsellingSchema = object({
  branchId: BranchIdSchema,
  date: RequiredText("Date"),
  durationMins: picklist([30, 45, 60]),
  encounterId: optional(pipe(string(), minLength(1))),
  mode: picklist(["in-person", "tele"]),
  notes: optional(pipe(string(), maxLength(2000))),
  patientId: RequiredText("Patient"),
});

const CreateWithdrawalChartSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  score: pipe(number("Score must be a number"), minValue(0)),
  tool: picklist(["CIWA", "CoWS"]),
});

const CreateRelapsePlanSchema = object({
  branchId: BranchIdSchema,
  patientId: RequiredText("Patient"),
  responses: RequiredText("Planned responses"),
  supportContacts: pipe(
    array(RequiredText("Support contact")),
    minLength(1, "Add at least one support contact"),
  ),
  triggers: pipe(array(RequiredText("Trigger")), minLength(1, "List at least one trigger")),
});

const UpdateRelapsePlanSchema = partial(CreateRelapsePlanSchema);

const CreateControlledPrescriptionSchema = object({
  branchId: BranchIdSchema,
  daysSupply: pipe(number(), minValue(1, "Days supply must be at least 1")),
  encounterId: RequiredText("Encounter"),
  lastRefillAt: optional(pipe(string(), minLength(1))),
  medicine: RequiredText("Medicine"),
  override: optional(boolean()),
  overrideReason: optional(pipe(string(), maxLength(1000))),
  patientId: RequiredText("Patient"),
  qty: pipe(number(), minValue(1, "Quantity must be at least 1")),
});

const CreateSideEffectCheckSchema = object({
  branchId: BranchIdSchema,
  effects: array(pipe(string(), maxLength(300))),
  patientId: RequiredText("Patient"),
  prescriptionId: RequiredText("Prescription"),
  severity: picklist(["none", "mild", "moderate", "severe"]),
});

const CreateCaregiverConsentSchema = object({
  branchId: BranchIdSchema,
  caregiverName: RequiredText("Caregiver name"),
  encounterId: optional(pipe(string(), minLength(1))),
  patientId: RequiredText("Patient"),
  relation: RequiredText("Relation"),
  scope: RequiredText("Scope"),
  status: picklist(["Pending", "Signed"]),
});

const UpdateCaregiverConsentSchema = partial(CreateCaregiverConsentSchema);

const CreateInvoluntaryHookSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(pipe(string(), minLength(1))),
  legalRef: RequiredText("Legal reference"),
  patientId: RequiredText("Patient"),
  reason: RequiredText("Reason"),
});

const CreateBreakGlassSchema = object({
  branchId: BranchIdSchema,
  patientId: RequiredText("Patient"),
  reason: pipe(string(), minLength(10, "Break-glass needs a detailed reason")),
});

const RecallListFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), minValue(1), maxValue(200, "Limit cannot exceed 200"))),
  riskLevel: optional(picklist(["Low", "Moderate", "High"])),
});

const PsychFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
});

export {
  BookCounsellingSchema,
  CreateBreakGlassSchema,
  CreateCaregiverConsentSchema,
  CreateControlledPrescriptionSchema,
  CreateInvoluntaryHookSchema,
  CreatePsychAssessmentSchema,
  CreateRelapsePlanSchema,
  CreateRiskScreenSchema,
  CreateSafetyPlanSchema,
  CreateScaleResultSchema,
  CreateSeniorAlertSchema,
  CreateSideEffectCheckSchema,
  CreateWithdrawalChartSchema,
  PsychFiltersSchema,
  PsychScaleSchema,
  RecallListFiltersSchema,
  UpdateCaregiverConsentSchema,
  UpdatePsychAssessmentSchema,
  UpdateRelapsePlanSchema,
};

export type {
  BreakGlassInput as CreateBreakGlassInput,
  CaregiverConsentInput as CreateCaregiverConsentInput,
  ControlledPrescriptionInput as CreateControlledPrescriptionInput,
  CounsellingBookInput as BookCounsellingInput,
  InvoluntaryHookInput as CreateInvoluntaryHookInput,
  PsychAssessmentInput as CreatePsychAssessmentInput,
  PsychFiltersInput as PsychFilters,
  RecallListFiltersInput as RecallListFilters,
  RelapsePlanInput as CreateRelapsePlanInput,
  RiskScreenInput as CreateRiskScreenInput,
  SafetyPlanInput as CreateSafetyPlanInput,
  ScaleResultInput as CreateScaleResultInput,
  SeniorAlertInput as CreateSeniorAlertInput,
  SideEffectCheckInput as CreateSideEffectCheckInput,
  UpdateCaregiverConsentInput,
  UpdatePsychAssessmentInput,
  UpdateRelapsePlanInput,
  WithdrawalChartInput as CreateWithdrawalChartInput,
};

type PsychAssessmentInput = InferOutput<typeof CreatePsychAssessmentSchema>;
type UpdatePsychAssessmentInput = InferOutput<typeof UpdatePsychAssessmentSchema>;
type ScaleResultInput = InferOutput<typeof CreateScaleResultSchema>;
type RiskScreenInput = InferOutput<typeof CreateRiskScreenSchema>;
type SafetyPlanInput = InferOutput<typeof CreateSafetyPlanSchema>;
type SeniorAlertInput = InferOutput<typeof CreateSeniorAlertSchema>;
type CounsellingBookInput = InferOutput<typeof BookCounsellingSchema>;
type WithdrawalChartInput = InferOutput<typeof CreateWithdrawalChartSchema>;
type RelapsePlanInput = InferOutput<typeof CreateRelapsePlanSchema>;
type UpdateRelapsePlanInput = InferOutput<typeof UpdateRelapsePlanSchema>;
type ControlledPrescriptionInput = InferOutput<typeof CreateControlledPrescriptionSchema>;
type SideEffectCheckInput = InferOutput<typeof CreateSideEffectCheckSchema>;
type CaregiverConsentInput = InferOutput<typeof CreateCaregiverConsentSchema>;
type UpdateCaregiverConsentInput = InferOutput<typeof UpdateCaregiverConsentSchema>;
type InvoluntaryHookInput = InferOutput<typeof CreateInvoluntaryHookSchema>;
type BreakGlassInput = InferOutput<typeof CreateBreakGlassSchema>;
type RecallListFiltersInput = InferOutput<typeof RecallListFiltersSchema>;
type PsychFiltersInput = InferOutput<typeof PsychFiltersSchema>;
