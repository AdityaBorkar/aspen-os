export const DOCUMENT_STATUS = {
  ACTIVE: "active",
  DELETED: "deleted",
  EXPIRED: "expired",
  TRIAGED: "triaged",
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const FIELD_TYPE = {
  BOOLEAN: "boolean",
  CONTACT: "contact",
  DATE: "date",
  EMAIL: "email",
  MULTI_SELECT: "multi-select",
  NUMBER: "number",
  PHONE: "phone",
  SELECT: "select",
  TEXT: "text",
  URL: "url",
  USER: "user",
} as const;

export type FieldType = (typeof FIELD_TYPE)[keyof typeof FIELD_TYPE];

export const GRANTEE_TYPE = {
  CONTACT: "contact",
  USER: "user",
} as const;

export type GranteeType = (typeof GRANTEE_TYPE)[keyof typeof GRANTEE_TYPE];

export const SHARE_PERMISSION = {
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type SharePermission =
  (typeof SHARE_PERMISSION)[keyof typeof SHARE_PERMISSION];

export const PIN_ITEM_TYPE = {
  CLASS: "class",
  TRIAGE: "triage",
  VIEW: "view",
} as const;

export type PinItemType = (typeof PIN_ITEM_TYPE)[keyof typeof PIN_ITEM_TYPE];

export const COMPRESSION_MODE = {
  ARCHIVE: "archive",
  IMAGE: "image",
  NONE: "none",
  PDF: "pdf",
} as const;

export type CompressionMode =
  (typeof COMPRESSION_MODE)[keyof typeof COMPRESSION_MODE];

export const SETTING_KEYS = {
  AUTO_PURGE_EVERY_HOURS: "autoPurgeEveryHours",
  DEFAULT_COMPRESSION: "defaultCompression",
  DEFAULT_RETENTION_DAYS: "defaultRetentionDays",
  LOG_DOWNLOADS: "logDownloads",
  PRESIGNED_URL_DEFAULT_EXPIRY: "presignedUrlDefaultExpiry",
  PRESIGNED_URL_MAX_EXPIRY: "presignedUrlMaxExpiry",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const AUDIT_ENTITY_TYPE = {
  CLASS: "dms:class",
  CONTACT: "dms:contact",
  DOCUMENT: "dms:document",
  SETTING: "dms:setting",
  SHARE: "dms:share",
  VIEW: "dms:view",
} as const;

export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  CLASSIFIED: "classified",
  CONTACT_REMOVED: "contact_removed",
  DELETED: "deleted",
  DOWNLOADED: "downloaded",
  EXPIRED: "expired",
  HOLD_PLACED: "hold_placed",
  HOLD_RELEASED: "hold_released",
  PURGED: "purged",
  RESTORED: "restored",
  SHARE_REVOKED: "share_revoked",
  SHARED: "shared",
  UPDATED: "updated",
  UPLOADED: "uploaded",
  VERSION_ADDED: "version_added",
  VERSION_REVERTED: "version_reverted",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const ITEM_TYPE = {
  FILE: "file",
  FOLDER: "folder",
} as const;

export type ItemType = (typeof ITEM_TYPE)[keyof typeof ITEM_TYPE];

export const ITEM_GRANTEE_TYPE = {
  GROUP: "group",
  USER: "user",
} as const;

export type ItemGranteeType =
  (typeof ITEM_GRANTEE_TYPE)[keyof typeof ITEM_GRANTEE_TYPE];

export const ITEM_PERMISSION = {
  EDITOR: "editor",
  OWNER: "owner",
  VIEWER: "viewer",
} as const;

export type ItemPermission =
  (typeof ITEM_PERMISSION)[keyof typeof ITEM_PERMISSION];

export const PUBLIC_LINK_PERMISSION = {
  EDIT: "edit",
  VIEW: "view",
} as const;

export type PublicLinkPermission =
  (typeof PUBLIC_LINK_PERMISSION)[keyof typeof PUBLIC_LINK_PERMISSION];

export const SCHEDULED_JOBS = {
  AUTO_PURGE: "dms:auto-purge",
  EXPIRY_SCAN: "dms:expiry-scan",
  ITEM_AUTO_PURGE: "dms:item-auto-purge",
} as const;

export type ScheduledJob = (typeof SCHEDULED_JOBS)[keyof typeof SCHEDULED_JOBS];
