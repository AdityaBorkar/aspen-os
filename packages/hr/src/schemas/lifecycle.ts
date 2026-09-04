import {
  ExitInterviewStatusSchema,
  FullAndFinalStatusSchema,
  LifecycleTaskStatusSchema,
  OnboardingStatusSchema,
  PromotionStatusSchema,
  SeparationStatusSchema,
  TransferStatusSchema,
} from "#/schemas/enums";

import { minLength, nullable, object, omit, optional, partial, pick, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

// Employee Onboarding

export const CreateOnboardingSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  expectedCompletionDate: optional(string()),
  metadata: optional(nullable(object({}))),
  notes: optional(nullable(string())),
  startDate: pipe(string(), minLength(1, "Start date is required")),
});

export type CreateOnboardingInput = InferOutput<typeof CreateOnboardingSchema>;

export const UpdateOnboardingSchema = object({
  ...partial(omit(CreateOnboardingSchema, ["employeeId"])).entries,
  actualCompletionDate: optional(string()),
  status: optional(OnboardingStatusSchema),
});

export type UpdateOnboardingInput = InferOutput<typeof UpdateOnboardingSchema>;

export const OnboardingFiltersSchema = object({
  ...partial(pick(CreateOnboardingSchema, ["employeeId"])).entries,
  status: optional(OnboardingStatusSchema),
});

export type OnboardingFilters = InferOutput<typeof OnboardingFiltersSchema>;

// Onboarding Task

export const CreateOnboardingTaskSchema = object({
  assignedTo: optional(nullable(string())),
  department: optional(nullable(string())),
  description: optional(nullable(string())),
  dueDate: optional(string()),
  notes: optional(nullable(string())),
  onboardingId: pipe(string(), minLength(1, "Onboarding ID is required")),
  title: pipe(string(), minLength(1, "Title is required")),
});

export type CreateOnboardingTaskInput = InferOutput<typeof CreateOnboardingTaskSchema>;

export const UpdateOnboardingTaskSchema = object({
  ...partial(omit(CreateOnboardingTaskSchema, ["onboardingId"])).entries,
  status: optional(LifecycleTaskStatusSchema),
});

export type UpdateOnboardingTaskInput = InferOutput<typeof UpdateOnboardingTaskSchema>;

// Employee Promotion

export const CreatePromotionSchema = object({
  currentDepartment: optional(nullable(string())),
  currentDesignation: pipe(string(), minLength(1, "Current designation is required")),
  currentGrade: optional(nullable(string())),
  effectiveDate: pipe(string(), minLength(1, "Effective date is required")),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  newDepartment: optional(nullable(string())),
  newDesignation: pipe(string(), minLength(1, "New designation is required")),
  newGrade: optional(nullable(string())),
  reason: optional(nullable(string())),
  salaryRevision: optional(nullable(string())),
});

export type CreatePromotionInput = InferOutput<typeof CreatePromotionSchema>;

export const UpdatePromotionSchema = partial(omit(CreatePromotionSchema, ["employeeId"]));

export type UpdatePromotionInput = InferOutput<typeof UpdatePromotionSchema>;

export const PromotionFiltersSchema = object({
  ...partial(pick(CreatePromotionSchema, ["employeeId"])).entries,
  status: optional(PromotionStatusSchema),
});

export type PromotionFilters = InferOutput<typeof PromotionFiltersSchema>;

// Employee Transfer

export const CreateTransferSchema = object({
  effectiveDate: pipe(string(), minLength(1, "Effective date is required")),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  fromBranch: optional(nullable(string())),
  fromCompany: optional(nullable(string())),
  fromDepartment: optional(nullable(string())),
  reason: optional(nullable(string())),
  toBranch: optional(nullable(string())),
  toCompany: optional(nullable(string())),
  toDepartment: optional(nullable(string())),
});

export type CreateTransferInput = InferOutput<typeof CreateTransferSchema>;

export const UpdateTransferSchema = partial(omit(CreateTransferSchema, ["employeeId"]));

export type UpdateTransferInput = InferOutput<typeof UpdateTransferSchema>;

export const TransferFiltersSchema = object({
  ...partial(pick(CreateTransferSchema, ["employeeId"])).entries,
  status: optional(TransferStatusSchema),
});

export type TransferFilters = InferOutput<typeof TransferFiltersSchema>;

// Employee Separation

export const CreateSeparationSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  exitDate: pipe(string(), minLength(1, "Exit date is required")),
  metadata: optional(nullable(object({}))),
  notes: optional(nullable(string())),
  reason: optional(nullable(string())),
  resignationDate: optional(string()),
});

export type CreateSeparationInput = InferOutput<typeof CreateSeparationSchema>;

export const UpdateSeparationSchema = object({
  ...partial(omit(CreateSeparationSchema, ["employeeId"])).entries,
  status: optional(SeparationStatusSchema),
});

export type UpdateSeparationInput = InferOutput<typeof UpdateSeparationSchema>;

export const SeparationFiltersSchema = object({
  ...partial(pick(CreateSeparationSchema, ["employeeId"])).entries,
  status: optional(SeparationStatusSchema),
});

export type SeparationFilters = InferOutput<typeof SeparationFiltersSchema>;

// Separation Task

export const CreateSeparationTaskSchema = object({
  assignedTo: optional(nullable(string())),
  department: optional(nullable(string())),
  description: optional(nullable(string())),
  dueDate: optional(string()),
  notes: optional(nullable(string())),
  separationId: pipe(string(), minLength(1, "Separation ID is required")),
  title: pipe(string(), minLength(1, "Title is required")),
});

export type CreateSeparationTaskInput = InferOutput<typeof CreateSeparationTaskSchema>;

export const UpdateSeparationTaskSchema = object({
  ...partial(omit(CreateSeparationTaskSchema, ["separationId"])).entries,
  status: optional(LifecycleTaskStatusSchema),
});

export type UpdateSeparationTaskInput = InferOutput<typeof UpdateSeparationTaskSchema>;

// Exit Interview

export const CreateExitInterviewSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  interviewer: optional(nullable(string())),
  questionnaireTemplate: optional(nullable(string())),
  scheduledDate: optional(string()),
  separationId: optional(nullable(string())),
});

export type CreateExitInterviewInput = InferOutput<typeof CreateExitInterviewSchema>;

export const UpdateExitInterviewSchema = object({
  ...partial(omit(CreateExitInterviewSchema, ["employeeId", "separationId"])).entries,
  completedDate: optional(string()),
  feedback: optional(nullable(string())),
  responses: optional(nullable(object({}))),
  status: optional(ExitInterviewStatusSchema),
});

export type UpdateExitInterviewInput = InferOutput<typeof UpdateExitInterviewSchema>;

export const ExitInterviewFiltersSchema = object({
  ...partial(pick(CreateExitInterviewSchema, ["employeeId"])).entries,
  status: optional(ExitInterviewStatusSchema),
});

export type ExitInterviewFilters = InferOutput<typeof ExitInterviewFiltersSchema>;

// Full and Final Statement

export const CreateFullAndFinalSchema = object({
  bonus: optional(string()),
  deductions: optional(string()),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  gratuity: optional(string()),
  leaveEncashment: optional(string()),
  loanRecovery: optional(string()),
  metadata: optional(nullable(object({}))),
  notes: optional(nullable(string())),
  pendingSalary: optional(string()),
  separationId: optional(nullable(string())),
});

export type CreateFullAndFinalInput = InferOutput<typeof CreateFullAndFinalSchema>;

export const UpdateFullAndFinalSchema = object({
  ...partial(omit(CreateFullAndFinalSchema, ["employeeId", "separationId"])).entries,
  approvedBy: optional(nullable(string())),
  netPayable: optional(string()),
  paidAt: optional(string()),
  paymentEntry: optional(nullable(string())),
  status: optional(FullAndFinalStatusSchema),
  totalDeductions: optional(string()),
  totalEarnings: optional(string()),
});

export type UpdateFullAndFinalInput = InferOutput<typeof UpdateFullAndFinalSchema>;

export const FullAndFinalFiltersSchema = object({
  ...partial(pick(CreateFullAndFinalSchema, ["employeeId"])).entries,
  status: optional(FullAndFinalStatusSchema),
});

export type FullAndFinalFilters = InferOutput<typeof FullAndFinalFiltersSchema>;
