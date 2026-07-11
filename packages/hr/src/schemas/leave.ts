import {
  boolean,
  type InferOutput,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import {
  CompensatoryLeaveStatusSchema,
  EarnedLeaveFrequencySchema,
  LeaveAllocationStatusSchema,
  LeaveApplicationStatusSchema,
  LeaveBlockListScopeSchema,
  LeaveEncashmentStatusSchema,
} from "./enums";

// Leave Type

export const CreateLeaveTypeSchema = object({
  allowNegativeBalance: optional(boolean()),
  applicableAfterWorkingDays: optional(number()),
  earnedLeaveFrequency: optional(EarnedLeaveFrequencySchema),
  includeHolidaysWithinLeaves: optional(boolean()),
  isCarryForward: optional(boolean()),
  isEarnedLeave: optional(boolean()),
  isLeaveWithoutPay: optional(boolean()),
  isPartiallyPaid: optional(boolean()),
  maxCarryForwardDays: optional(number()),
  maxContinuousDaysAllowed: optional(number()),
  maxDaysAllowed: number(),
  name: pipe(string(), minLength(1, "Name is required")),
});

export type CreateLeaveTypeInput = InferOutput<typeof CreateLeaveTypeSchema>;

export const UpdateLeaveTypeSchema = object({
  allowNegativeBalance: optional(boolean()),
  applicableAfterWorkingDays: optional(number()),
  earnedLeaveFrequency: optional(EarnedLeaveFrequencySchema),
  includeHolidaysWithinLeaves: optional(boolean()),
  isActive: optional(boolean()),
  isCarryForward: optional(boolean()),
  isEarnedLeave: optional(boolean()),
  isLeaveWithoutPay: optional(boolean()),
  isPartiallyPaid: optional(boolean()),
  maxCarryForwardDays: optional(number()),
  maxContinuousDaysAllowed: optional(number()),
  maxDaysAllowed: optional(number()),
  name: optional(string()),
});

export type UpdateLeaveTypeInput = InferOutput<typeof UpdateLeaveTypeSchema>;

// Leave Period

export const CreateLeavePeriodSchema = object({
  company: optional(nullable(string())),
  endDate: pipe(string(), minLength(1, "End date is required")),
  name: pipe(string(), minLength(1, "Name is required")),
  startDate: pipe(string(), minLength(1, "Start date is required")),
});

export type CreateLeavePeriodInput = InferOutput<
  typeof CreateLeavePeriodSchema
>;

export const UpdateLeavePeriodSchema = object({
  company: optional(nullable(string())),
  endDate: optional(string()),
  isActive: optional(boolean()),
  name: optional(string()),
  startDate: optional(string()),
});

export type UpdateLeavePeriodInput = InferOutput<
  typeof UpdateLeavePeriodSchema
>;

// Leave Policy

export const CreateLeavePolicySchema = object({
  description: optional(nullable(string())),
  name: pipe(string(), minLength(1, "Name is required")),
});

export type CreateLeavePolicyInput = InferOutput<
  typeof CreateLeavePolicySchema
>;

export const UpdateLeavePolicySchema = object({
  description: optional(nullable(string())),
  isActive: optional(boolean()),
  name: optional(string()),
});

export type UpdateLeavePolicyInput = InferOutput<
  typeof UpdateLeavePolicySchema
>;

// Leave Policy Detail

export const CreateLeavePolicyDetailSchema = object({
  carryForwardDays: optional(number()),
  leavePolicyId: pipe(string(), minLength(1, "Leave policy ID is required")),
  leaveType: pipe(string(), minLength(1, "Leave type is required")),
  maxDays: number(),
});

export type CreateLeavePolicyDetailInput = InferOutput<
  typeof CreateLeavePolicyDetailSchema
>;

// Leave Policy Assignment

export const CreateLeavePolicyAssignmentSchema = object({
  effectiveFrom: pipe(
    string(),
    minLength(1, "Effective from date is required"),
  ),
  effectiveTo: optional(string()),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  leavePeriod: pipe(string(), minLength(1, "Leave period is required")),
  leavePolicy: pipe(string(), minLength(1, "Leave policy is required")),
});

export type CreateLeavePolicyAssignmentInput = InferOutput<
  typeof CreateLeavePolicyAssignmentSchema
>;

export const UpdateLeavePolicyAssignmentSchema = object({
  effectiveFrom: optional(string()),
  effectiveTo: optional(string()),
  isActive: optional(boolean()),
  leavePeriod: optional(string()),
  leavePolicy: optional(string()),
});

export type UpdateLeavePolicyAssignmentInput = InferOutput<
  typeof UpdateLeavePolicyAssignmentSchema
>;

export const LeavePolicyAssignmentFiltersSchema = object({
  employeeId: optional(string()),
  leavePeriod: optional(string()),
  leavePolicy: optional(string()),
});

export type LeavePolicyAssignmentFilters = InferOutput<
  typeof LeavePolicyAssignmentFiltersSchema
>;

// Leave Allocation

export const CreateLeaveAllocationSchema = object({
  carryForwardedDays: optional(string()),
  earnedDays: optional(string()),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  leavePeriod: pipe(string(), minLength(1, "Leave period is required")),
  leavePolicyAssignment: optional(nullable(string())),
  leaveType: pipe(string(), minLength(1, "Leave type is required")),
  totalDays: pipe(string(), minLength(1, "Total days is required")),
  usedDays: optional(string()),
});

export type CreateLeaveAllocationInput = InferOutput<
  typeof CreateLeaveAllocationSchema
>;

export const UpdateLeaveAllocationSchema = object({
  carryForwardedDays: optional(string()),
  earnedDays: optional(string()),
  leavePolicyAssignment: optional(nullable(string())),
  status: optional(LeaveAllocationStatusSchema),
  totalDays: optional(string()),
  usedDays: optional(string()),
});

export type UpdateLeaveAllocationInput = InferOutput<
  typeof UpdateLeaveAllocationSchema
>;

export const LeaveAllocationFiltersSchema = object({
  employeeId: optional(string()),
  leavePeriod: optional(string()),
  leaveType: optional(string()),
  status: optional(LeaveAllocationStatusSchema),
});

export type LeaveAllocationFilters = InferOutput<
  typeof LeaveAllocationFiltersSchema
>;

// Leave Application

export const CreateLeaveApplicationSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  fromDate: pipe(string(), minLength(1, "From date is required")),
  halfDayDate: optional(string()),
  isHalfDay: optional(boolean()),
  leaveAllocation: optional(nullable(string())),
  leaveType: pipe(string(), minLength(1, "Leave type is required")),
  reason: optional(nullable(string())),
  toDate: pipe(string(), minLength(1, "To date is required")),
  totalDays: pipe(string(), minLength(1, "Total days is required")),
});

export type CreateLeaveApplicationInput = InferOutput<
  typeof CreateLeaveApplicationSchema
>;

export const UpdateLeaveApplicationSchema = object({
  fromDate: optional(string()),
  halfDayDate: optional(string()),
  isHalfDay: optional(boolean()),
  leaveAllocation: optional(nullable(string())),
  leaveType: optional(string()),
  reason: optional(nullable(string())),
  toDate: optional(string()),
  totalDays: optional(string()),
});

export type UpdateLeaveApplicationInput = InferOutput<
  typeof UpdateLeaveApplicationSchema
>;

export const LeaveApplicationFiltersSchema = object({
  employeeId: optional(string()),
  leaveType: optional(string()),
  status: optional(LeaveApplicationStatusSchema),
});

export type LeaveApplicationFilters = InferOutput<
  typeof LeaveApplicationFiltersSchema
>;

// Compensatory Leave Request

export const CreateCompensatoryLeaveSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  leaveType: pipe(string(), minLength(1, "Leave type is required")),
  numberOfDays: optional(string()),
  reason: pipe(string(), minLength(1, "Reason is required")),
  workDate: pipe(string(), minLength(1, "Work date is required")),
});

export type CreateCompensatoryLeaveInput = InferOutput<
  typeof CreateCompensatoryLeaveSchema
>;

export const UpdateCompensatoryLeaveSchema = object({
  leaveType: optional(string()),
  numberOfDays: optional(string()),
  reason: optional(string()),
  workDate: optional(string()),
});

export type UpdateCompensatoryLeaveInput = InferOutput<
  typeof UpdateCompensatoryLeaveSchema
>;

export const CompensatoryLeaveFiltersSchema = object({
  employeeId: optional(string()),
  status: optional(CompensatoryLeaveStatusSchema),
});

export type CompensatoryLeaveFilters = InferOutput<
  typeof CompensatoryLeaveFiltersSchema
>;

// Leave Encashment

export const CreateLeaveEncashmentSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  encashableDays: pipe(string(), minLength(1, "Encashable days is required")),
  encashedDays: pipe(string(), minLength(1, "Encashed days is required")),
  leavePeriod: pipe(string(), minLength(1, "Leave period is required")),
  leaveType: pipe(string(), minLength(1, "Leave type is required")),
});

export type CreateLeaveEncashmentInput = InferOutput<
  typeof CreateLeaveEncashmentSchema
>;

export const UpdateLeaveEncashmentSchema = object({
  amount: optional(nullable(string())),
  encashableDays: optional(string()),
  encashedDays: optional(string()),
  leavePeriod: optional(string()),
  leaveType: optional(string()),
});

export type UpdateLeaveEncashmentInput = InferOutput<
  typeof UpdateLeaveEncashmentSchema
>;

export const LeaveEncashmentFiltersSchema = object({
  employeeId: optional(string()),
  status: optional(LeaveEncashmentStatusSchema),
});

export type LeaveEncashmentFilters = InferOutput<
  typeof LeaveEncashmentFiltersSchema
>;

// Leave Block List

export const CreateLeaveBlockListSchema = object({
  company: optional(nullable(string())),
  department: optional(nullable(string())),
  fromDate: pipe(string(), minLength(1, "From date is required")),
  name: pipe(string(), minLength(1, "Name is required")),
  reason: optional(nullable(string())),
  scope: LeaveBlockListScopeSchema,
  toDate: pipe(string(), minLength(1, "To date is required")),
});

export type CreateLeaveBlockListInput = InferOutput<
  typeof CreateLeaveBlockListSchema
>;

export const UpdateLeaveBlockListSchema = object({
  company: optional(nullable(string())),
  department: optional(nullable(string())),
  fromDate: optional(string()),
  isActive: optional(boolean()),
  name: optional(string()),
  reason: optional(nullable(string())),
  scope: optional(LeaveBlockListScopeSchema),
  toDate: optional(string()),
});

export type UpdateLeaveBlockListInput = InferOutput<
  typeof UpdateLeaveBlockListSchema
>;

export const LeaveBlockListFiltersSchema = object({
  company: optional(string()),
  department: optional(string()),
  scope: optional(LeaveBlockListScopeSchema),
});

export type LeaveBlockListFilters = InferOutput<
  typeof LeaveBlockListFiltersSchema
>;

// Leave Adjustment

export const CreateLeaveAdjustmentSchema = object({
  adjustedBy: pipe(string(), minLength(1, "Adjusted by is required")),
  days: pipe(string(), minLength(1, "Days is required")),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  leavePeriod: optional(nullable(string())),
  leaveType: pipe(string(), minLength(1, "Leave type is required")),
  reason: pipe(string(), minLength(1, "Reason is required")),
});

export type CreateLeaveAdjustmentInput = InferOutput<
  typeof CreateLeaveAdjustmentSchema
>;
