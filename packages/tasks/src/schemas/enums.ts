import { enum as enum_ } from "valibot";

export const TaskPrioritySchema = enum_({
  high: "high",
  low: "low",
  medium: "medium",
  none: "none",
  urgent: "urgent",
});

export const TaskLinkTypeSchema = enum_({
  blocked_by: "blocked_by",
  blocks: "blocks",
  caused_by: "caused_by",
  duplicates: "duplicates",
  related_to: "related_to",
  split_from: "split_from",
});

export const ProjectStatusSchema = enum_({
  active: "active",
  archived: "archived",
  paused: "paused",
});

export const ProjectMemberRoleSchema = enum_({
  admin: "admin",
  member: "member",
  viewer: "viewer",
});

export const StatusCategorySchema = enum_({
  backlog: "backlog",
  cancelled: "cancelled",
  completed: "completed",
  started: "started",
  unstarted: "unstarted",
});

export const SavedViewTypeSchema = enum_({
  board: "board",
  calendar: "calendar",
  list: "list",
  timeline: "timeline",
});

export const ReminderTypeSchema = enum_({
  custom: "custom",
  due_date: "due_date",
  overdue: "overdue",
});

export const AutomationTriggerSchema = enum_({
  assignment_change: "assignment_change",
  due_date_passed: "due_date_passed",
  status_change: "status_change",
  task_created: "task_created",
  task_updated: "task_updated",
});
