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

const requiredText = (label: string) => pipe(string(), minLength(1, `${label} is required`));

const CreatePsychAssessmentSchema = object({
  branchId: BranchIdSchema,
  chiefComplaint: requiredText("Chief complaint"),
  encounterId: requiredText("Encounter"),
  history: requiredText("History"),
  impression: requiredText("Impression"),
  mentalStatusExam: requiredText("Mental status exam"),
  patientId: requiredText("Patient"),
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
  encounterId: requiredText("Encounter"),
  maxScore: pipe(number(), minValue(1)),
  override: optional(boolean()),
  overrideReason: optional(pipe(string(), maxLength(1000))),
  patientId: requiredText("Patient"),
  scale: PsychScaleSchema,
  score: pipe(number("Score must be a number"), minValue(0)),
});

const CreateRiskScreenSchema = object({
  branchId: BranchIdSchema,
  encounterId: requiredText("Encounter"),
  factors: pipe(
    array(requiredText("Risk factor")),
    minLength(1, "Record at least one risk factor"),
  ),
  level: picklist(["Low", "Moderate", "High"]),
  patientId: requiredText("Patient"),
});

const CreateSafetyPlanSchema = object({
  branchId: BranchIdSchema,
  contacts: pipe(
    array(requiredText("Contact")),
    minLength(1, "Add at least one emergency contact"),
  ),
  copingStrategies: requiredText("Coping strategies"),
  encounterId: requiredText("Encounter"),
  meansRestriction: requiredText("Means restriction"),
  patientId: requiredText("Patient"),
  warningSigns: requiredText("Warning signs"),
});

const CreateSeniorAlertSchema = object({
  branchId: BranchIdSchema,
  encounterId: optional(pipe(string(), minLength(1))),
  patientId: requiredText("Patient"),
  reason: requiredText("Reason"),
});

const BookCounsellingSchema = object({
  branchId: BranchIdSchema,
  consentId: optional(pipe(string(), minLength(1))),
  date: requiredText("Date"),
  durationMins: picklist([30, 45, 60]),
  encounterId: optional(pipe(string(), minLength(1))),
  link: optional(pipe(string(), maxLength(2000))),
  mode: picklist(["in-person", "tele"]),
  notes: optional(pipe(string(), maxLength(2000))),
  patientId: requiredText("Patient"),
  patientIsMinor: optional(boolean()),
});

const CreateWithdrawalChartSchema = object({
  branchId: BranchIdSchema,
  chartSchedule: optional(pipe(string(), maxLength(500))),
  encounterId: optional(pipe(string(), minLength(1))),
  lastUseAt: optional(pipe(string(), minLength(1))),
  patientId: requiredText("Patient"),
  score: pipe(number("Score must be a number"), minValue(0)),
  substance: optional(pipe(string(), maxLength(500))),
  substanceHistory: optional(pipe(string(), maxLength(4000))),
  tool: picklist(["CIWA", "CoWS"]),
});

const CreateRelapsePlanSchema = object({
  branchId: BranchIdSchema,
  followUpDates: optional(array(pipe(string(), minLength(1)))),
  patientId: requiredText("Patient"),
  responses: requiredText("Planned responses"),
  supportContacts: pipe(
    array(requiredText("Support contact")),
    minLength(1, "Add at least one support contact"),
  ),
  triggers: pipe(array(requiredText("Trigger")), minLength(1, "List at least one trigger")),
});

const UpdateRelapsePlanSchema = partial(CreateRelapsePlanSchema);

const CreateControlledPrescriptionSchema = object({
  branchId: BranchIdSchema,
  daysSupply: pipe(number(), minValue(1, "Days supply must be at least 1")),
  encounterId: requiredText("Encounter"),
  lastRefillAt: optional(pipe(string(), minLength(1))),
  maxDays: optional(pipe(number(), minValue(1))),
  medicine: requiredText("Medicine"),
  override: optional(boolean()),
  overrideReason: optional(pipe(string(), maxLength(1000))),
  patientId: requiredText("Patient"),
  qty: pipe(number(), minValue(1, "Quantity must be at least 1")),
});

const CreateSideEffectCheckSchema = object({
  branchId: BranchIdSchema,
  effects: array(pipe(string(), maxLength(300))),
  eps: optional(picklist(["none", "mild", "moderate", "severe"])),
  metabolic: optional(picklist(["none", "flagged"])),
  patientId: requiredText("Patient"),
  prescriptionId: requiredText("Prescription"),
  sedation: optional(picklist(["none", "mild", "moderate", "severe"])),
  severity: picklist(["none", "mild", "moderate", "severe"]),
  weightKg: optional(pipe(number(), minValue(0))),
});

const CreateCaregiverConsentSchema = object({
  branchId: BranchIdSchema,
  caregiverName: requiredText("Caregiver name"),
  encounterId: optional(pipe(string(), minLength(1))),
  idNumber: optional(pipe(string(), maxLength(100))),
  patientId: requiredText("Patient"),
  patientIsMinor: optional(boolean()),
  relation: requiredText("Relation"),
  scope: requiredText("Scope"),
  status: picklist(["Pending", "Signed"]),
});

const UpdateCaregiverConsentSchema = partial(CreateCaregiverConsentSchema);

const CreateInvoluntaryHookSchema = object({
  authority: optional(pipe(string(), maxLength(500))),
  branchId: BranchIdSchema,
  encounterId: optional(pipe(string(), minLength(1))),
  legalRef: requiredText("Legal reference"),
  patientId: requiredText("Patient"),
  reason: requiredText("Reason"),
  reviewDate: optional(pipe(string(), minLength(1))),
});

const RecallListFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), minValue(1), maxValue(200, "Limit cannot exceed 200"))),
  minDaysOverdue: optional(pipe(number(), minValue(0))),
  riskLevel: optional(picklist(["Low", "Moderate", "High"])),
});

const CloseReadinessSchema = object({
  branchId: BranchIdSchema,
  encounterId: requiredText("Encounter"),
  patientId: requiredText("Patient"),
});

const PsychFiltersSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  patientId: optional(pipe(string(), minLength(1))),
});

export {
  BookCounsellingSchema,
  CloseReadinessSchema,
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
  CaregiverConsentInput as CreateCaregiverConsentInput,
  CloseReadinessInput,
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
type CloseReadinessInput = InferOutput<typeof CloseReadinessSchema>;
type RecallListFiltersInput = InferOutput<typeof RecallListFiltersSchema>;
type PsychFiltersInput = InferOutput<typeof PsychFiltersSchema>;
