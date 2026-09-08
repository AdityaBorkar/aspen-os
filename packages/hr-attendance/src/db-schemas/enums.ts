import { pgEnum } from "drizzle-orm/pg-core";

export const attendanceStatusEnum = pgEnum("hr_attendance_status", [
  "absent",
  "half_day",
  "on_leave",
  "present",
  "work_from_home",
]);

export const checkinLogTypeEnum = pgEnum("hr_checkin_log_type", ["in", "out"]);

export const attendanceRequestStatusEnum = pgEnum("hr_attendance_request_status", [
  "approved",
  "pending",
  "rejected",
]);

export const shiftRequestStatusEnum = pgEnum("hr_shift_request_status", [
  "approved",
  "pending",
  "rejected",
]);

export const shiftAssignmentStatusEnum = pgEnum("hr_shift_assignment_status", [
  "active",
  "completed",
  "inactive",
]);

export const overtimeStatusEnum = pgEnum("hr_overtime_status", ["approved", "pending", "rejected"]);
