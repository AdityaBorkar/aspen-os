import { enum as enum_ } from "valibot";

export const AttendanceStatusSchema = enum_({
  absent: "absent",
  half_day: "half_day",
  on_leave: "on_leave",
  present: "present",
  work_from_home: "work_from_home",
});

export const CheckinLogTypeSchema = enum_({
  in: "in",
  out: "out",
});

export const AttendanceRequestStatusSchema = enum_({
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
});

export const ShiftRequestStatusSchema = enum_({
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
});

export const ShiftAssignmentStatusSchema = enum_({
  active: "active",
  completed: "completed",
  inactive: "inactive",
});

export const OvertimeStatusSchema = enum_({
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
});
