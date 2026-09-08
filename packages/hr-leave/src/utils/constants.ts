export const HR_PERMISSION_MODULE = {
  LEAVE: "leave",
} as const;

export type HrPermissionModule = (typeof HR_PERMISSION_MODULE)[keyof typeof HR_PERMISSION_MODULE];

export const ACCESS_LEVEL = {
  FULL: "full",
  MANAGE: "manage",
  READ_ONLY: "read_only",
} as const;

export type AccessLevel = (typeof ACCESS_LEVEL)[keyof typeof ACCESS_LEVEL];

export const PERMISSION_ACTION = {
  APPROVE: "approve",
  ARCHIVE: "archive",
  CREATE: "create",
  DELETE: "delete",
  MANAGE: "manage",
  PUBLISH: "publish",
  REJECT: "reject",
  UPDATE: "update",
  VIEW: "view",
} as const;

export type PermissionAction = (typeof PERMISSION_ACTION)[keyof typeof PERMISSION_ACTION];

export const SCHEDULED_JOBS = {
  DAILY_LEAVE_ACCRUAL: "hr:daily-leave-accrual",
} as const;

export const CRON_SCHEDULES = {
  DAILY_LEAVE_ACCRUAL: "0 0 * * *",
} as const;
