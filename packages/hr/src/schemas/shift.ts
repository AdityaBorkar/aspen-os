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

import { ShiftAssignmentStatusSchema, ShiftRequestStatusSchema } from "./enums";

// Shift Type

export const CreateShiftTypeSchema = object({
  allowCheckOutAfterEnd: optional(number()),
  allowOvertime: optional(boolean()),
  beginCheckInBeforeStart: optional(number()),
  determineCheckInBy: optional(nullable(string())),
  earlyExitGraceMinutes: optional(number()),
  enableAutoAttendance: optional(boolean()),
  enableAutoUpdateSync: optional(boolean()),
  endTime: pipe(string(), minLength(1, "End time is required")),
  holidayList: optional(nullable(string())),
  isActive: optional(boolean()),
  lateEntryGraceMinutes: optional(number()),
  markAttendanceOnHolidays: optional(boolean()),
  name: pipe(string(), minLength(1, "Name is required")),
  overtimeType: optional(nullable(string())),
  processAttendanceAfter: optional(string()),
  startTime: pipe(string(), minLength(1, "Start time is required")),
  workingHoursCalculation: optional(nullable(string())),
  workingHoursThresholdForAbsent: optional(nullable(string())),
  workingHoursThresholdForHalfDay: optional(nullable(string())),
});

export type CreateShiftTypeInput = InferOutput<typeof CreateShiftTypeSchema>;

export const UpdateShiftTypeSchema = object({
  allowCheckOutAfterEnd: optional(number()),
  allowOvertime: optional(boolean()),
  beginCheckInBeforeStart: optional(number()),
  determineCheckInBy: optional(nullable(string())),
  earlyExitGraceMinutes: optional(number()),
  enableAutoAttendance: optional(boolean()),
  enableAutoUpdateSync: optional(boolean()),
  endTime: optional(string()),
  holidayList: optional(nullable(string())),
  isActive: optional(boolean()),
  lateEntryGraceMinutes: optional(number()),
  markAttendanceOnHolidays: optional(boolean()),
  name: optional(string()),
  overtimeType: optional(nullable(string())),
  processAttendanceAfter: optional(string()),
  startTime: optional(string()),
  workingHoursCalculation: optional(nullable(string())),
  workingHoursThresholdForAbsent: optional(nullable(string())),
  workingHoursThresholdForHalfDay: optional(nullable(string())),
});

export type UpdateShiftTypeInput = InferOutput<typeof UpdateShiftTypeSchema>;

// Shift Location

export const CreateShiftLocationSchema = object({
  isActive: optional(boolean()),
  latitude: pipe(string(), minLength(1, "Latitude is required")),
  longitude: pipe(string(), minLength(1, "Longitude is required")),
  name: pipe(string(), minLength(1, "Name is required")),
  radius: optional(number()),
});

export type CreateShiftLocationInput = InferOutput<
  typeof CreateShiftLocationSchema
>;

export const UpdateShiftLocationSchema = object({
  isActive: optional(boolean()),
  latitude: optional(string()),
  longitude: optional(string()),
  name: optional(string()),
  radius: optional(number()),
});

export type UpdateShiftLocationInput = InferOutput<
  typeof UpdateShiftLocationSchema
>;

// Shift Assignment

export const CreateShiftAssignmentSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  endDate: optional(string()),
  notes: optional(nullable(string())),
  shiftLocation: optional(nullable(string())),
  shiftType: pipe(string(), minLength(1, "Shift type is required")),
  startDate: pipe(string(), minLength(1, "Start date is required")),
});

export type CreateShiftAssignmentInput = InferOutput<
  typeof CreateShiftAssignmentSchema
>;

export const UpdateShiftAssignmentSchema = object({
  endDate: optional(string()),
  notes: optional(nullable(string())),
  shiftLocation: optional(nullable(string())),
  shiftType: optional(string()),
  startDate: optional(string()),
  status: optional(ShiftAssignmentStatusSchema),
});

export type UpdateShiftAssignmentInput = InferOutput<
  typeof UpdateShiftAssignmentSchema
>;

export const ShiftAssignmentFiltersSchema = object({
  employeeId: optional(string()),
  endDate: optional(string()),
  shiftType: optional(string()),
  startDate: optional(string()),
  status: optional(ShiftAssignmentStatusSchema),
});

export type ShiftAssignmentFilters = InferOutput<
  typeof ShiftAssignmentFiltersSchema
>;

// Shift Request

export const CreateShiftRequestSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  fromDate: pipe(string(), minLength(1, "From date is required")),
  reason: optional(nullable(string())),
  shiftType: pipe(string(), minLength(1, "Shift type is required")),
  toDate: optional(string()),
});

export type CreateShiftRequestInput = InferOutput<
  typeof CreateShiftRequestSchema
>;

export const UpdateShiftRequestSchema = object({
  fromDate: optional(string()),
  reason: optional(nullable(string())),
  shiftType: optional(string()),
  toDate: optional(string()),
});

export type UpdateShiftRequestInput = InferOutput<
  typeof UpdateShiftRequestSchema
>;

export const ShiftRequestFiltersSchema = object({
  employeeId: optional(string()),
  status: optional(ShiftRequestStatusSchema),
});

export type ShiftRequestFilters = InferOutput<typeof ShiftRequestFiltersSchema>;

// Shift Schedule

export const CreateShiftScheduleSchema = object({
  friday: optional(boolean()),
  isActive: optional(boolean()),
  monday: optional(boolean()),
  name: pipe(string(), minLength(1, "Name is required")),
  saturday: optional(boolean()),
  shiftType: pipe(string(), minLength(1, "Shift type is required")),
  sunday: optional(boolean()),
  thursday: optional(boolean()),
  tuesday: optional(boolean()),
  wednesday: optional(boolean()),
});

export type CreateShiftScheduleInput = InferOutput<
  typeof CreateShiftScheduleSchema
>;

export const UpdateShiftScheduleSchema = object({
  friday: optional(boolean()),
  isActive: optional(boolean()),
  monday: optional(boolean()),
  name: optional(string()),
  saturday: optional(boolean()),
  shiftType: optional(string()),
  sunday: optional(boolean()),
  thursday: optional(boolean()),
  tuesday: optional(boolean()),
  wednesday: optional(boolean()),
});

export type UpdateShiftScheduleInput = InferOutput<
  typeof UpdateShiftScheduleSchema
>;

// Shift Schedule Assignment

export const CreateShiftScheduleAssignmentSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  endDate: optional(string()),
  isActive: optional(boolean()),
  shiftSchedule: pipe(string(), minLength(1, "Shift schedule is required")),
  startDate: pipe(string(), minLength(1, "Start date is required")),
});

export type CreateShiftScheduleAssignmentInput = InferOutput<
  typeof CreateShiftScheduleAssignmentSchema
>;

export const UpdateShiftScheduleAssignmentSchema = object({
  endDate: optional(string()),
  isActive: optional(boolean()),
  shiftSchedule: optional(string()),
  startDate: optional(string()),
});

export type UpdateShiftScheduleAssignmentInput = InferOutput<
  typeof UpdateShiftScheduleAssignmentSchema
>;
