export const HR_PERMISSION_MODULE = {
  ANNOUNCEMENT: "announcement",
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

export const ANNOUNCEMENT_STATUS = {
  ARCHIVED: "archived",
  DRAFT: "draft",
  PUBLISHED: "published",
  SCHEDULED: "scheduled",
} as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUS)[keyof typeof ANNOUNCEMENT_STATUS];

export const ANNOUNCEMENT_CHANNEL = {
  CUSTOM: "custom",
  GENERAL: "general",
  HR: "hr",
} as const;

export type AnnouncementChannel = (typeof ANNOUNCEMENT_CHANNEL)[keyof typeof ANNOUNCEMENT_CHANNEL];

export const ANNOUNCEMENT_PRIORITY = {
  IMPORTANT: "important",
  NORMAL: "normal",
  URGENT: "urgent",
} as const;

export type AnnouncementPriority =
  (typeof ANNOUNCEMENT_PRIORITY)[keyof typeof ANNOUNCEMENT_PRIORITY];
