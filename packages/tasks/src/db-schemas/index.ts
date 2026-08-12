export { activityLog } from "./activity-log";
export { attachment } from "./attachment";
export { automationRule } from "./automation-rule";
export { comment } from "./comment";
export {
  automationTriggerEnum,
  projectMemberRoleEnum,
  projectStatusEnum,
  reminderTypeEnum,
  savedViewTypeEnum,
  statusCategoryEnum,
  taskLinkTypeEnum,
  taskPriorityEnum,
} from "./enums";
export { label } from "./label";
export { project } from "./project";
export { projectMember } from "./project-member";
export { reminder } from "./reminder";
export { savedView } from "./saved-view";
export { status } from "./status";
export { statusTransition } from "./status-transition";
export { task } from "./task";
export { taskAssignee } from "./task-assignee";
export { taskLink } from "./task-link";
export { taskType } from "./task-type";
export { timeEntry } from "./time-entry";
export { watcher } from "./watcher";

import { activityLog } from "./activity-log";
import { attachment } from "./attachment";
import { automationRule } from "./automation-rule";
import { comment } from "./comment";
import { label } from "./label";
import { project } from "./project";
import { projectMember } from "./project-member";
import { reminder } from "./reminder";
import { savedView } from "./saved-view";
import { status } from "./status";
import { statusTransition } from "./status-transition";
import { task } from "./task";
import { taskAssignee } from "./task-assignee";
import { taskLink } from "./task-link";
import { taskType } from "./task-type";
import { timeEntry } from "./time-entry";
import { watcher } from "./watcher";

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
