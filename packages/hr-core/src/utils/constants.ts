export const HR_PERMISSION_MODULE = {
  ACCESS: "access",
  ANNOUNCEMENT: "announcement",
  EMPLOYEE: "employee",
  LIFECYCLE: "lifecycle",
  POSITION: "position",
  SETUP: "setup",
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
  ANNOUNCEMENT_SCHEDULER: "hr:announcement-scheduler",
} as const;

export const CRON_SCHEDULES = {
  ANNOUNCEMENT_SCHEDULER: "* * * * *",
} as const;
