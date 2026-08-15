export const TASK_PRIORITY = {
  HIGH: "high",
  LOW: "low",
  MEDIUM: "medium",
  NONE: "none",
  URGENT: "urgent",
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const TASK_LINK_TYPE = {
  BLOCKED_BY: "blocked_by",
  BLOCKS: "blocks",
  CAUSED_BY: "caused_by",
  DUPLICATES: "duplicates",
  RELATED_TO: "related_to",
  SPLIT_FROM: "split_from",
} as const;

export type TaskLinkType = (typeof TASK_LINK_TYPE)[keyof typeof TASK_LINK_TYPE];

export const PROJECT_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  PAUSED: "paused",
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const PROJECT_MEMBER_ROLE = {
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLE)[keyof typeof PROJECT_MEMBER_ROLE];

export const STATUS_CATEGORY = {
  BACKLOG: "backlog",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  STARTED: "started",
  UNSTARTED: "unstarted",
} as const;

export type StatusCategory = (typeof STATUS_CATEGORY)[keyof typeof STATUS_CATEGORY];

export const SAVED_VIEW_TYPE = {
  BOARD: "board",
  CALENDAR: "calendar",
  LIST: "list",
  TIMELINE: "timeline",
} as const;

export type SavedViewType = (typeof SAVED_VIEW_TYPE)[keyof typeof SAVED_VIEW_TYPE];

export const REMINDER_TYPE = {
  CUSTOM: "custom",
  DUE_DATE: "due_date",
  OVERDUE: "overdue",
} as const;

export type ReminderType = (typeof REMINDER_TYPE)[keyof typeof REMINDER_TYPE];

export const AUTOMATION_TRIGGER = {
  ASSIGNMENT_CHANGE: "assignment_change",
  DUE_DATE_PASSED: "due_date_passed",
  STATUS_CHANGE: "status_change",
  TASK_CREATED: "task_created",
  TASK_UPDATED: "task_updated",
} as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGER)[keyof typeof AUTOMATION_TRIGGER];

const AUTOMATION_TRIGGERS = new Set<string>(Object.values(AUTOMATION_TRIGGER));
const TASK_PRIORITIES = new Set<string>(Object.values(TASK_PRIORITY));
const SAVED_VIEW_TYPES = new Set<string>(Object.values(SAVED_VIEW_TYPE));

export function isAutomationTrigger(value: string): value is AutomationTrigger {
  return AUTOMATION_TRIGGERS.has(value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.has(value);
}

export function isSavedViewType(value: string): value is SavedViewType {
  return SAVED_VIEW_TYPES.has(value);
}
