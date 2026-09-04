import { ShiftAssignmentStatusSchema, ShiftRequestStatusSchema } from "#/schemas/enums";

import {
  boolean,
  minLength,
  nullable,
  number,
  object,
  omit,
  optional,
  partial,
  pick,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

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

export const UpdateShiftTypeSchema = partial(CreateShiftTypeSchema);

export type UpdateShiftTypeInput = InferOutput<typeof UpdateShiftTypeSchema>;

// Shift Location

export const CreateShiftLocationSchema = object({
  isActive: optional(boolean()),
  latitude: pipe(string(), minLength(1, "Latitude is required")),
  longitude: pipe(string(), minLength(1, "Longitude is required")),
  name: pipe(string(), minLength(1, "Name is required")),
  radius: optional(number()),
});

export type CreateShiftLocationInput = InferOutput<typeof CreateShiftLocationSchema>;

export const UpdateShiftLocationSchema = partial(CreateShiftLocationSchema);

export type UpdateShiftLocationInput = InferOutput<typeof UpdateShiftLocationSchema>;

// Shift Assignment

export const CreateShiftAssignmentSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  endDate: optional(string()),
  notes: optional(nullable(string())),
  shiftLocation: optional(nullable(string())),
  shiftType: pipe(string(), minLength(1, "Shift type is required")),
  startDate: pipe(string(), minLength(1, "Start date is required")),
});

export type CreateShiftAssignmentInput = InferOutput<typeof CreateShiftAssignmentSchema>;

export const UpdateShiftAssignmentSchema = object({
  ...partial(omit(CreateShiftAssignmentSchema, ["employeeId"])).entries,
  status: optional(ShiftAssignmentStatusSchema),
});

export type UpdateShiftAssignmentInput = InferOutput<typeof UpdateShiftAssignmentSchema>;

export const ShiftAssignmentFiltersSchema = object({
  ...partial(pick(CreateShiftAssignmentSchema, ["employeeId", "endDate", "shiftType", "startDate"]))
    .entries,
  status: optional(ShiftAssignmentStatusSchema),
});

export type ShiftAssignmentFilters = InferOutput<typeof ShiftAssignmentFiltersSchema>;

// Shift Request

export const CreateShiftRequestSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  fromDate: pipe(string(), minLength(1, "From date is required")),
  reason: optional(nullable(string())),
  shiftType: pipe(string(), minLength(1, "Shift type is required")),
  toDate: optional(string()),
});

export type CreateShiftRequestInput = InferOutput<typeof CreateShiftRequestSchema>;

export const UpdateShiftRequestSchema = partial(omit(CreateShiftRequestSchema, ["employeeId"]));

export type UpdateShiftRequestInput = InferOutput<typeof UpdateShiftRequestSchema>;

export const ShiftRequestFiltersSchema = object({
  ...partial(pick(CreateShiftRequestSchema, ["employeeId"])).entries,
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

export type CreateShiftScheduleInput = InferOutput<typeof CreateShiftScheduleSchema>;

export const UpdateShiftScheduleSchema = partial(CreateShiftScheduleSchema);

export type UpdateShiftScheduleInput = InferOutput<typeof UpdateShiftScheduleSchema>;

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

export const UpdateShiftScheduleAssignmentSchema = partial(
  omit(CreateShiftScheduleAssignmentSchema, ["employeeId"]),
);

export type UpdateShiftScheduleAssignmentInput = InferOutput<
  typeof UpdateShiftScheduleAssignmentSchema
>;
