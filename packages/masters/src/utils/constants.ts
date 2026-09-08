export const AUDIT_ENTITY_TYPE = {
  ADDRESS: "masters:address",
  BRANCH: "masters:branch",
  CONNECTION: "masters:connection",
  CONTACT: "masters:contact",
  ENTITY: "masters:entity",
  FILTER_VIEW: "masters:filter_view",
  ORG_BRANCH: "masters:org_branch",
  PAYMENT_METHOD: "masters:payment_method",
  SETTING: "masters:setting",
  UNIT_OF_MEASURE: "masters:unit_of_measure",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  ACTIVATED: "activated",
  CREATED: "created",
  CREDENTIAL_ROTATED: "credential_rotated",
  DEACTIVATED: "deactivated",
  DELETED: "deleted",
  DUPLICATED: "duplicated",
  PRIMARY_SET: "primary_set",
  TESTED: "tested",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const FILTER_VIEW_ACCESS = {
  GLOBAL: "global",
  PERSONAL: "personal",
} as const;

export type FilterViewAccess = (typeof FILTER_VIEW_ACCESS)[keyof typeof FILTER_VIEW_ACCESS];

export const FILTER_VIEW_TYPE = {
  BOARD: "board",
  CALENDAR: "calendar",
  LIST: "list",
  TIMELINE: "timeline",
} as const;

export type FilterViewType = (typeof FILTER_VIEW_TYPE)[keyof typeof FILTER_VIEW_TYPE];

export const FILTER_VIEW_DOMAIN = {
  COMPLIANCE_DOCUMENT: "compliance:document",
  DMS_FILE: "dms:file",
  HR_EMPLOYEE: "hr:employee",
  NOTES_NOTE: "notes:note",
  TASKS_TASK: "tasks:task",
  WORKSPACE_DRAFT: "workspace:draft",
} as const;

export type FilterViewDomain = (typeof FILTER_VIEW_DOMAIN)[keyof typeof FILTER_VIEW_DOMAIN];

/**
 * Keys under this prefix are tenant-wide settings (org.*); every other key is
 * scoped to the acting user.
 */
export const SETTING_KEY_PREFIX = {
  ORG: "org.",
} as const;

/**
 * Settings keys, namespaced by scope: `org.*` keys are tenant-wide, all other
 * keys are per-user. The former @aspen-os/workspace per-user settings migrated
 * as-is.
 */
export const SETTING_KEYS = {
  DEFAULT_RANGE: "default_range",
  DEFAULT_VIEW: "default_view",
  HOME_DASHBOARD: "home_dashboard",
  ORG_BRANDING: "org.branding",
  ORG_ID: "org.id",
  ORG_LOGO: "org.logo",
  TIMEZONE: "timezone",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
