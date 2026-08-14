import { pgEnum } from "drizzle-orm/pg-core";

import {
  AUTOMATION_TRIGGER,
  PROJECT_MEMBER_ROLE,
  PROJECT_STATUS,
  REMINDER_TYPE,
  SAVED_VIEW_TYPE,
  STATUS_CATEGORY,
  TASK_LINK_TYPE,
  TASK_PRIORITY,
} from "../utils/constants";

export const taskPriorityEnum = pgEnum("task_priority", [
  TASK_PRIORITY.URGENT,
  TASK_PRIORITY.HIGH,
  TASK_PRIORITY.MEDIUM,
  TASK_PRIORITY.LOW,
  TASK_PRIORITY.NONE,
]);

export const taskLinkTypeEnum = pgEnum("task_link_type", [
  TASK_LINK_TYPE.BLOCKS,
  TASK_LINK_TYPE.BLOCKED_BY,
  TASK_LINK_TYPE.RELATED_TO,
  TASK_LINK_TYPE.DUPLICATES,
  TASK_LINK_TYPE.CAUSED_BY,
  TASK_LINK_TYPE.SPLIT_FROM,
]);

export const projectStatusEnum = pgEnum("project_status", [
  PROJECT_STATUS.ACTIVE,
  PROJECT_STATUS.ARCHIVED,
  PROJECT_STATUS.PAUSED,
]);

export const projectMemberRoleEnum = pgEnum("project_member_role", [
  PROJECT_MEMBER_ROLE.ADMIN,
  PROJECT_MEMBER_ROLE.MEMBER,
  PROJECT_MEMBER_ROLE.VIEWER,
]);

export const statusCategoryEnum = pgEnum("status_category", [
  STATUS_CATEGORY.BACKLOG,
  STATUS_CATEGORY.UNSTARTED,
  STATUS_CATEGORY.STARTED,
  STATUS_CATEGORY.COMPLETED,
  STATUS_CATEGORY.CANCELLED,
]);

export const savedViewTypeEnum = pgEnum("saved_view_type", [
  SAVED_VIEW_TYPE.LIST,
  SAVED_VIEW_TYPE.BOARD,
  SAVED_VIEW_TYPE.CALENDAR,
  SAVED_VIEW_TYPE.TIMELINE,
]);

export const reminderTypeEnum = pgEnum("reminder_type", [
  REMINDER_TYPE.DUE_DATE,
  REMINDER_TYPE.CUSTOM,
  REMINDER_TYPE.OVERDUE,
]);

export const automationTriggerEnum = pgEnum("automation_trigger", [
  AUTOMATION_TRIGGER.STATUS_CHANGE,
  AUTOMATION_TRIGGER.ASSIGNMENT_CHANGE,
  AUTOMATION_TRIGGER.DUE_DATE_PASSED,
  AUTOMATION_TRIGGER.TASK_CREATED,
  AUTOMATION_TRIGGER.TASK_UPDATED,
]);
