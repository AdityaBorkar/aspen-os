import {
  boolean,
  type InferOutput,
  minLength,
  nullable,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { OvertimeStatusSchema } from "./enums";

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

export type CreateOvertimeTypeInput = InferOutput<
  typeof CreateOvertimeTypeSchema
>;

export const UpdateOvertimeTypeSchema = object({
  amountCalculation: optional(string()),
  description: optional(nullable(string())),
  fixedHourlyRate: optional(nullable(string())),
  holidayMultiplier: optional(string()),
  isActive: optional(boolean()),
  maxOvertimeHoursPerDay: optional(nullable(string())),
  name: optional(string()),
  overtimeSalaryComponent: optional(nullable(string())),
  standardMultiplier: optional(string()),
  weekendMultiplier: optional(string()),
});

export type UpdateOvertimeTypeInput = InferOutput<
  typeof UpdateOvertimeTypeSchema
>;

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
  totalOvertimeHours: pipe(
    string(),
    minLength(1, "Total overtime hours is required"),
  ),
  weekendHours: optional(string()),
});

export type CreateOvertimeSlipInput = InferOutput<
  typeof CreateOvertimeSlipSchema
>;

export const UpdateOvertimeSlipSchema = object({
  amount: optional(nullable(string())),
  fromDate: optional(string()),
  holidayHours: optional(string()),
  metadata: optional(nullable(object({}))),
  notes: optional(nullable(string())),
  overtimeType: optional(string()),
  standardHours: optional(string()),
  toDate: optional(string()),
  totalOvertimeHours: optional(string()),
  weekendHours: optional(string()),
});

export type UpdateOvertimeSlipInput = InferOutput<
  typeof UpdateOvertimeSlipSchema
>;

export const OvertimeSlipFiltersSchema = object({
  employeeId: optional(string()),
  overtimeType: optional(string()),
  status: optional(OvertimeStatusSchema),
});

export type OvertimeSlipFilters = InferOutput<typeof OvertimeSlipFiltersSchema>;
