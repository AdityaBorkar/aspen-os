import {
  AttendanceRequestStatusSchema,
  AttendanceStatusSchema,
  CheckinLogTypeSchema,
} from "#/schemas/enums";

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

// Attendance

export const CreateAttendanceSchema = object({
  attendanceRequest: optional(nullable(string())),
  checkInTime: optional(string()),
  checkOutTime: optional(string()),
  date: pipe(string(), minLength(1, "Date is required")),
  earlyExit: optional(boolean()),
  earlyExitMinutes: optional(number()),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  halfDayType: optional(nullable(string())),
  isHalfDay: optional(boolean()),
  lateEntry: optional(boolean()),
  lateEntryMinutes: optional(number()),
  metadata: optional(nullable(object({}))),
  notes: optional(nullable(string())),
  shift: optional(nullable(string())),
  status: AttendanceStatusSchema,
  workingHours: optional(nullable(string())),
});

export type CreateAttendanceInput = InferOutput<typeof CreateAttendanceSchema>;

export const UpdateAttendanceSchema = partial(omit(CreateAttendanceSchema, ["date", "employeeId"]));

export type UpdateAttendanceInput = InferOutput<typeof UpdateAttendanceSchema>;

export const AttendanceFiltersSchema = object({
  ...partial(pick(CreateAttendanceSchema, ["date", "employeeId", "shift"])).entries,
  endDate: optional(string()),
  startDate: optional(string()),
  status: optional(AttendanceStatusSchema),
});

export type AttendanceFilters = InferOutput<typeof AttendanceFiltersSchema>;

// Employee Checkin

export const CreateCheckinSchema = object({
  deviceId: optional(nullable(string())),
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  isOffShift: optional(boolean()),
  latitude: optional(nullable(string())),
  logType: CheckinLogTypeSchema,
  longitude: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  shift: optional(nullable(string())),
  time: pipe(string(), minLength(1, "Time is required")),
});

export type CreateCheckinInput = InferOutput<typeof CreateCheckinSchema>;

export const CheckinFiltersSchema = object({
  ...partial(
    pick(CreateCheckinSchema, ["deviceId", "employeeId", "isOffShift", "logType", "shift"]),
  ).entries,
  endDate: optional(string()),
  startDate: optional(string()),
});

export type CheckinFilters = InferOutput<typeof CheckinFiltersSchema>;

// Attendance Request

export const CreateAttendanceRequestSchema = object({
  employeeId: pipe(string(), minLength(1, "Employee ID is required")),
  fromDate: pipe(string(), minLength(1, "From date is required")),
  reason: pipe(string(), minLength(1, "Reason is required")),
  toDate: pipe(string(), minLength(1, "To date is required")),
});

export type CreateAttendanceRequestInput = InferOutput<typeof CreateAttendanceRequestSchema>;

export const UpdateAttendanceRequestSchema = partial(
  omit(CreateAttendanceRequestSchema, ["employeeId"]),
);

export type UpdateAttendanceRequestInput = InferOutput<typeof UpdateAttendanceRequestSchema>;

export const AttendanceRequestFiltersSchema = object({
  ...partial(pick(CreateAttendanceRequestSchema, ["employeeId"])).entries,
  status: optional(AttendanceRequestStatusSchema),
});

export type AttendanceRequestFilters = InferOutput<typeof AttendanceRequestFiltersSchema>;
