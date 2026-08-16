export const WORKSPACE_ACCESS = {
  GLOBAL: "global",
  PERSONAL: "personal",
} as const;

export type WorkspaceAccess = (typeof WORKSPACE_ACCESS)[keyof typeof WORKSPACE_ACCESS];

export const DRAFT_STATUS = {
  APPROVED: "approved",
  DRAFT: "draft",
  PUBLISHED: "published",
  REJECTED: "rejected",
  SUBMITTED: "submitted",
} as const;

export type DraftStatus = (typeof DRAFT_STATUS)[keyof typeof DRAFT_STATUS];

export const WIDGET_TYPE = {
  BREAKDOWN: "breakdown",
  EMBED: "embed",
  LIST: "list",
  METRIC: "metric",
} as const;

export type WidgetType = (typeof WIDGET_TYPE)[keyof typeof WIDGET_TYPE];

export const WIDGET_AGGREGATION = {
  AVG: "avg",
  COUNT: "count",
  MAX: "max",
  MIN: "min",
  SUM: "sum",
} as const;

export type WidgetAggregation = (typeof WIDGET_AGGREGATION)[keyof typeof WIDGET_AGGREGATION];

export const EMBED_KIND = {
  IFRAME: "iframe",
  MARKDOWN: "markdown",
  URL: "url",
} as const;

export type EmbedKind = (typeof EMBED_KIND)[keyof typeof EMBED_KIND];

export const WORKSPACE_ITEM_TYPE = {
  DASHBOARD: "dashboard",
  DRAFT: "draft",
  VIEW: "view",
} as const;

export type WorkspaceItemType = (typeof WORKSPACE_ITEM_TYPE)[keyof typeof WORKSPACE_ITEM_TYPE];

export const RANGE_PRESET = {
  ALL_TIME: "all_time",
  CUSTOM: "custom",
  LAST_7_DAYS: "last_7_days",
  THIS_MONTH: "this_month",
  THIS_QUARTER: "this_quarter",
  THIS_WEEK: "this_week",
  THIS_YEAR: "this_year",
  TODAY: "today",
  YESTERDAY: "yesterday",
} as const;

export type RangePreset = (typeof RANGE_PRESET)[keyof typeof RANGE_PRESET];

export const SETTING_KEYS = {
  DEFAULT_RANGE: "default_range",
  DEFAULT_VIEW: "default_view",
  HOME_DASHBOARD: "home_dashboard",
  TIMEZONE: "timezone",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const SCHEDULE_FORMAT = {
  EXPORT: "export",
  PDF: "pdf",
  URL: "url",
} as const;

export type ScheduleFormat = (typeof SCHEDULE_FORMAT)[keyof typeof SCHEDULE_FORMAT];

export const VIEW_DOMAIN = {
  COMPLIANCE_DOCUMENT: "compliance:document",
  DMS_FILE: "dms:file",
  HR_EMPLOYEE: "hr:employee",
  TASKS_TASK: "tasks:task",
  WORKSPACE_DRAFT: "workspace:draft",
} as const;

export type ViewDomain = (typeof VIEW_DOMAIN)[keyof typeof VIEW_DOMAIN];

export const SCHEDULE_CRON_TOPIC_PREFIX = "workspace:schedule:";

export const AUDIT_ENTITY_TYPE = {
  DASHBOARD: "workspace:dashboard",
  DRAFT: "workspace:draft",
  DRAFT_COMMENT: "workspace:draft_comment",
  PIN: "workspace:pin",
  RECENT: "workspace:recent",
  SCHEDULE: "workspace:schedule",
  SEARCH: "workspace:search",
  SETTING: "workspace:setting",
  VIEW: "workspace:view",
  WATCH: "workspace:watch",
  WIDGET: "workspace:widget",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  APPROVED: "approved",
  COMMENTED: "commented",
  COMMENT_REMOVED: "comment_removed",
  CREATED: "created",
  DELETED: "deleted",
  DELIVERED: "delivered",
  DUPLICATED: "duplicated",
  EXPORTED: "exported",
  IMPORTED: "imported",
  MARKED_RUN: "marked_run",
  PAUSED: "paused",
  PINNED: "pinned",
  PUBLISHED: "published",
  REFRESHED: "refreshed",
  REJECTED: "rejected",
  REOPENED: "reopened",
  RESTORED: "restored",
  RESUMED: "resumed",
  SUBMITTED: "submitted",
  TOUCHED: "touched",
  TRASHED: "trashed",
  UNPINNED: "unpinned",
  UPDATED: "updated",
  WATCH_SUBSCRIBED: "watch_subscribed",
  WATCH_UNSUBSCRIBED: "watch_unsubscribed",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];
