import { OvertimeStatusSchema } from "#/schemas/enums";

import {
  boolean,
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

// Overtime Type

export const CreateOvertimeTypeSchema = object({
  amountCalculation: optional(string()),
  description: optional(nullable(string())),
  fixedHourlyRate: optional(nullable(string())),
  holidayMultiplier: optional(string()),
  maxOvertimeHoursPerDay: optional(nullable(string())),
  name: pipe(string(), minLength(1, "Name is required")),
  overtimeSalaryComponent: optional(nullable(string())),
  standardMultiplier: optional(string()),
  weekendMultiplier: optional(string()),
});

export type CreateOvertimeTypeInput = InferOutput<typeof CreateOvertimeTypeSchema>;

export const UpdateOvertimeTypeSchema = object({
  ...partial(CreateOvertimeTypeSchema).entries,
  isActive: optional(boolean()),
});

export type UpdateOvertimeTypeInput = InferOutput<typeof UpdateOvertimeTypeSchema>;

// Overtime Slip

export const CreateOvertimeSlipSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  fromDate: pipe(string(), minLength(1, "From date is required")),
  holidayHours: optional(string()),
  metadata: optional(nullable(object({}))),
  notes: optional(nullable(string())),
  overtimeType: pipe(string(), minLength(1, "Overtime type is required")),
  standardHours: optional(string()),
  toDate: pipe(string(), minLength(1, "To date is required")),
  totalOvertimeHours: pipe(string(), minLength(1, "Total overtime hours is required")),
  weekendHours: optional(string()),
});

export type CreateOvertimeSlipInput = InferOutput<typeof CreateOvertimeSlipSchema>;

export const UpdateOvertimeSlipSchema = object({
  ...partial(omit(CreateOvertimeSlipSchema, ["employeeId"])).entries,
  amount: optional(nullable(string())),
});

export type UpdateOvertimeSlipInput = InferOutput<typeof UpdateOvertimeSlipSchema>;

export const OvertimeSlipFiltersSchema = object({
  ...partial(pick(CreateOvertimeSlipSchema, ["employeeId", "overtimeType"])).entries,
  status: optional(OvertimeStatusSchema),
});

export type OvertimeSlipFilters = InferOutput<typeof OvertimeSlipFiltersSchema>;
