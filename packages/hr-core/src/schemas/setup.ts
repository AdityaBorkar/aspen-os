import { NameSchema } from "#/schemas/utils";

import {
  boolean,
  minLength,
  nullable,
  number,
  object,
  optional,
  partial,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

// HR Settings

export const UpdateHrSettingsSchema = object({
  allowMultipleShiftAssignments: optional(boolean()),
  autoAttendance: optional(boolean()),
  defaultHolidayList: optional(nullable(string())),
  employeeNamingSeries: optional(nullable(string())),
  expenseClaimDefault: optional(nullable(string())),
  geolocationTracking: optional(boolean()),
  leaveApprovalWorkflow: optional(nullable(string())),
  leaveWithoutPayHandling: optional(nullable(string())),
});

export type UpdateHrSettingsInput = InferOutput<typeof UpdateHrSettingsSchema>;

// Payroll Settings

export const UpdatePayrollSettingsSchema = object({
  benefitsApplicationMandatory: optional(boolean()),
  fiscalYearEnd: optional(string()),
  fiscalYearStart: optional(string()),
  incomeTaxComponent: optional(nullable(string())),
  multiCurrencyExpenseClaims: optional(boolean()),
  payrollPeriodEnd: optional(string()),
  payrollPeriodStart: optional(string()),
  rounding: optional(nullable(string())),
});

export type UpdatePayrollSettingsInput = InferOutput<typeof UpdatePayrollSettingsSchema>;

// Department

export const CreateDepartmentSchema = object({
  code: pipe(string(), minLength(2, "Code must be at least 2 characters")),
  costCenter: optional(nullable(string())),
  headcount: optional(nullable(number())),
  manager: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  parentDepartment: optional(nullable(string())),
});

export type CreateDepartmentInput = InferOutput<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = object({
  ...partial(CreateDepartmentSchema).entries,
  isActive: optional(boolean()),
});

export type UpdateDepartmentInput = InferOutput<typeof UpdateDepartmentSchema>;

// Old UpdateDepartment accepted a bare optional code while Create requires
// minLength(2); the derived schema is strictly more correct (same rule).
export const MoveDepartmentSchema = object({
  newParentId: optional(nullable(string())),
});

export type MoveDepartmentInput = InferOutput<typeof MoveDepartmentSchema>;

export const SetDepartmentHeadSchema = object({
  employeeId: optional(nullable(string())),
});

export type SetDepartmentHeadInput = InferOutput<typeof SetDepartmentHeadSchema>;

export const DepartmentFiltersSchema = object({
  isActive: optional(boolean()),
  parentDepartment: optional(string()),
});

export type DepartmentFilters = InferOutput<typeof DepartmentFiltersSchema>;
