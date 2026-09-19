import { CreateEmployeeSchema, CreateSkillMapSchema } from "#/schemas/employee";
import {
  OnboardingStatusSchema,
  PromotionStatusSchema,
  SeparationStatusSchema,
  TransferStatusSchema,
} from "#/schemas/enums";

import {
  array,
  minLength,
  nullable,
  object,
  omit,
  optional,
  partial,
  pick,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

// Employee Promotion

export const CreatePromotionSchema = object({
  currentDepartment: optional(nullable(string())),
  effectiveDate: pipe(string(), minLength(1, "Effective date is required")),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  newDepartment: optional(nullable(string())),
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

// Employee Onboarding

export const CreateOnboardingSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  metadata: optional(nullable(object({}))),
  notes: optional(nullable(string())),
});

export type CreateOnboardingInput = InferOutput<typeof CreateOnboardingSchema>;

export const UpdateOnboardingSchema = object({
  ...partial(omit(CreateOnboardingSchema, ["employeeId"])).entries,
  status: optional(OnboardingStatusSchema),
});

export type UpdateOnboardingInput = InferOutput<typeof UpdateOnboardingSchema>;

export const OnboardingFiltersSchema = object({
  ...partial(pick(CreateOnboardingSchema, ["employeeId"])).entries,
  status: optional(OnboardingStatusSchema),
});

export type OnboardingFilters = InferOutput<typeof OnboardingFiltersSchema>;

// Employee Onboarding — single-submit onboarding: employee record + pre-entered
// skills + onboarding transition. `employeeId` values are derived server-side
// from the freshly created employee, so callers never pass them.

export const OnboardEmployeeSchema = object({
  employee: CreateEmployeeSchema,
  onboarding: optional(object({ notes: optional(nullable(string())) })),
  skills: optional(array(omit(CreateSkillMapSchema, ["employeeId"]))),
});

export type OnboardEmployeeInput = InferOutput<typeof OnboardEmployeeSchema>;
