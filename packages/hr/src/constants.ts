export const HR_PERMISSION_MODULE = {
  ACCESS: "access",
  ATTENDANCE: "attendance",
  EMPLOYEE: "employee",
  LEAVE: "leave",
  LIFECYCLE: "lifecycle",
  OVERTIME: "overtime",
  SETUP: "setup",
  SHIFT: "shift",
} as const;

export type HrPermissionModule =
  (typeof HR_PERMISSION_MODULE)[keyof typeof HR_PERMISSION_MODULE];

export const ACCESS_LEVEL = {
  FULL: "full",
  MANAGE: "manage",
  READ_ONLY: "read_only",
} as const;

export type AccessLevel = (typeof ACCESS_LEVEL)[keyof typeof ACCESS_LEVEL];

export const PERMISSION_ACTION = {
  APPROVE: "approve",
  CREATE: "create",
  DELETE: "delete",
  MANAGE: "manage",
  REJECT: "reject",
  UPDATE: "update",
  VIEW: "view",
} as const;

export type PermissionAction =
  (typeof PERMISSION_ACTION)[keyof typeof PERMISSION_ACTION];

export const SCHEDULED_JOBS = {
  DAILY_ATTENDANCE_SYNC: "hr:daily-attendance-sync",
  DAILY_LEAVE_ACCRUAL: "hr:daily-leave-accrual",
} as const;

export const CRON_SCHEDULES = {
  DAILY_ATTENDANCE_SYNC: "0 1 * * *",
  DAILY_LEAVE_ACCRUAL: "0 0 * * *",
} as const;
