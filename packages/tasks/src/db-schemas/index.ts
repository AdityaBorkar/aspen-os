export { activityLog } from "#/db-schemas/activity-log";
export { attachment } from "#/db-schemas/attachment";
export { automationRule } from "#/db-schemas/automation-rule";
export { comment } from "#/db-schemas/comment";
export {
  automationTriggerEnum,
  projectMemberRoleEnum,
  projectStatusEnum,
  reminderTypeEnum,
  savedViewTypeEnum,
  statusCategoryEnum,
  taskLinkTypeEnum,
  taskPriorityEnum,
} from "#/db-schemas/enums";
export { label } from "#/db-schemas/label";
export { project } from "#/db-schemas/project";
export { projectMember } from "#/db-schemas/project-member";
export { reminder } from "#/db-schemas/reminder";
export { savedView } from "#/db-schemas/saved-view";
export { status } from "#/db-schemas/status";
export { statusTransition } from "#/db-schemas/status-transition";
export { task } from "#/db-schemas/task";
export { taskAssignee } from "#/db-schemas/task-assignee";
export { taskLink } from "#/db-schemas/task-link";
export { taskType } from "#/db-schemas/task-type";
export { timeEntry } from "#/db-schemas/time-entry";
export { watcher } from "#/db-schemas/watcher";

import { activityLog } from "#/db-schemas/activity-log";
import { attachment } from "#/db-schemas/attachment";
import { automationRule } from "#/db-schemas/automation-rule";
import { comment } from "#/db-schemas/comment";
import { label } from "#/db-schemas/label";
import { project } from "#/db-schemas/project";
import { projectMember } from "#/db-schemas/project-member";
import { reminder } from "#/db-schemas/reminder";
import { savedView } from "#/db-schemas/saved-view";
import { status } from "#/db-schemas/status";
import { statusTransition } from "#/db-schemas/status-transition";
import { task } from "#/db-schemas/task";
import { taskAssignee } from "#/db-schemas/task-assignee";
import { taskLink } from "#/db-schemas/task-link";
import { taskType } from "#/db-schemas/task-type";
import { timeEntry } from "#/db-schemas/time-entry";
import { watcher } from "#/db-schemas/watcher";

export const control_plane_schemas = {
  label,
  project,
  projectMember,
  status,
  statusTransition,
  taskType,
} as const;

export const tenant_schemas = {
  activityLog,
  attachment,
  automationRule,
  comment,
  reminder,
  savedView,
  task,
  taskAssignee,
  taskLink,
  timeEntry,
  watcher,
} as const;
