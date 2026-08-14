import { picklist } from "valibot";

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

export const TaskPrioritySchema = picklist(Object.values(TASK_PRIORITY));

export const TaskLinkTypeSchema = picklist(Object.values(TASK_LINK_TYPE));

export const ProjectStatusSchema = picklist(Object.values(PROJECT_STATUS));

export const ProjectMemberRoleSchema = picklist(Object.values(PROJECT_MEMBER_ROLE));

export const StatusCategorySchema = picklist(Object.values(STATUS_CATEGORY));

export const SavedViewTypeSchema = picklist(Object.values(SAVED_VIEW_TYPE));

export const ReminderTypeSchema = picklist(Object.values(REMINDER_TYPE));

export const AutomationTriggerSchema = picklist(Object.values(AUTOMATION_TRIGGER));

export {
  AUTOMATION_TRIGGER,
  PROJECT_MEMBER_ROLE,
  PROJECT_STATUS,
  REMINDER_TYPE,
  SAVED_VIEW_TYPE,
  STATUS_CATEGORY,
  TASK_LINK_TYPE,
  TASK_PRIORITY,
};
