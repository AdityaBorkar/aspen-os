import type { Module, ModuleInfra } from "@aspen-os/platform/server";

import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import { createAutomationRule } from "./workflows/automation.create";
import { deleteAutomationRule } from "./workflows/automation.delete";
import { evaluateAutomationRules } from "./workflows/automation.evaluate";
import { getAutomationRule } from "./workflows/automation.get";
import { getActiveAutomationRules } from "./workflows/automation.get-active";
import { listAutomationRulesByProject } from "./workflows/automation.list-by-project";
import { updateAutomationRule } from "./workflows/automation.update";
import { getActivityLog } from "./workflows/collaboration.activity-log";
import { addAttachment } from "./workflows/collaboration.add-attachment";
import { addWatcher } from "./workflows/collaboration.add-watcher";
import { deleteAttachment } from "./workflows/collaboration.delete-attachment";
import { listAttachments } from "./workflows/collaboration.list-attachments";
import { listAttachmentsByComment } from "./workflows/collaboration.list-attachments-by-comment";
import { listWatchers } from "./workflows/collaboration.list-watchers";
import { removeWatcher } from "./workflows/collaboration.remove-watcher";
import { createComment } from "./workflows/comment.create";
import { deleteComment } from "./workflows/comment.delete";
import { getComment } from "./workflows/comment.get";
import { listCommentsByTask } from "./workflows/comment.list-by-task";
import { listCommentReplies } from "./workflows/comment.list-replies";
import { updateComment } from "./workflows/comment.update";
import { createTaskLink } from "./workflows/link.create";
import { getTaskLinkCriticalPath } from "./workflows/link.critical-path";
import { deleteTaskLink } from "./workflows/link.delete";
import { getTaskLinkDependencyGraph } from "./workflows/link.dependency-graph";
import { listLinksByTask } from "./workflows/link.list-by-task";
import { topologicalSortTasks } from "./workflows/link.topological-sort";
import { addProjectMember } from "./workflows/project.add-member";
import { archiveProject } from "./workflows/project.archive";
import { createProject } from "./workflows/project.create";
import { deleteProject } from "./workflows/project.delete";
import { getProject } from "./workflows/project.get";
import { listProjects } from "./workflows/project.list";
import { listProjectMembers } from "./workflows/project.list-members";
import { removeProjectMember } from "./workflows/project.remove-member";
import { restoreProject } from "./workflows/project.restore";
import { updateProject } from "./workflows/project.update";
import { updateProjectMember } from "./workflows/project.update-member";
import { createReminder } from "./workflows/reminder.create";
import { createDueDateReminders } from "./workflows/reminder.create-due-date";
import { createOverdueReminder } from "./workflows/reminder.create-overdue";
import { deleteReminder } from "./workflows/reminder.delete";
import { getReminder } from "./workflows/reminder.get";
import { getPendingReminders } from "./workflows/reminder.get-pending";
import { listReminders } from "./workflows/reminder.list";
import { processPendingReminders } from "./workflows/reminder.process-pending";
import { updateReminder } from "./workflows/reminder.update";
import { createStatus } from "./workflows/status.create";
import { createTransition } from "./workflows/status.create-transition";
import { deleteStatus } from "./workflows/status.delete";
import { deleteTransition } from "./workflows/status.delete-transition";
import { getStatus } from "./workflows/status.get";
import { getGlobalStatuses } from "./workflows/status.global";
import { listStatuses } from "./workflows/status.list";
import { listTransitions } from "./workflows/status.list-transitions";
import { updateStatus } from "./workflows/status.update";
import { validateTransition } from "./workflows/status.validate-transition";
import { createTaskType } from "./workflows/task-type.create";
import { createLabel } from "./workflows/task-type.create-label";
import { deleteTaskType } from "./workflows/task-type.delete";
import { deleteLabel } from "./workflows/task-type.delete-label";
import { listTaskTypes } from "./workflows/task-type.list";
import { listLabels } from "./workflows/task-type.list-labels";
import { updateTaskType } from "./workflows/task-type.update";
import { updateLabel } from "./workflows/task-type.update-label";
import { archiveTask } from "./workflows/task.archive";
import { assignTask } from "./workflows/task.assign";
import { getTaskAssignees } from "./workflows/task.assignees";
import { bulkUpdateTask } from "./workflows/task.bulk-update";
import { getTaskCompletionSummary } from "./workflows/task.completion-summary";
import { createTask } from "./workflows/task.create";
import { deleteTask } from "./workflows/task.delete";
import { getTask } from "./workflows/task.get";
import { listTasks } from "./workflows/task.list";
import { getTaskLoggedHours } from "./workflows/task.logged-hours";
import { restoreTask } from "./workflows/task.restore";
import { getSubTasks } from "./workflows/task.sub-tasks";
import { unassignTask } from "./workflows/task.unassign";
import { updateTask } from "./workflows/task.update";
import { createTimeEntry } from "./workflows/time-entry.create";
import { deleteTimeEntry } from "./workflows/time-entry.delete";
import { getTimeEntry } from "./workflows/time-entry.get";
import { listTimeEntries } from "./workflows/time-entry.list";
import { getTimeEntryTotalDuration } from "./workflows/time-entry.total-duration";
import { updateTimeEntry } from "./workflows/time-entry.update";
import { createSavedView } from "./workflows/view.create";
import { deleteSavedView } from "./workflows/view.delete";
import { getSavedView } from "./workflows/view.get";
import { getDefaultSavedView } from "./workflows/view.get-default";
import { listSavedViewsByOwner } from "./workflows/view.list-by-owner";
import { listSavedViewsByProject } from "./workflows/view.list-by-project";
import { listSharedSavedViews } from "./workflows/view.list-shared";
import { updateSavedView } from "./workflows/view.update";

export interface TaskModuleConfig {
  enableNotifications?: boolean;
}

export class Tasks implements Module {
  static create(config?: TaskModuleConfig): Tasks {
    return new Tasks(config ?? {});
  }

  readonly $name = "tasks";
  readonly $dependencies = [] as const;
  readonly $config: TaskModuleConfig;

  constructor(config: TaskModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize() {}

  $prepareRuntime() {}

  $cleanup() {}

  readonly tasks = {
    archive: archiveTask,
    assign: assignTask,
    bulkUpdate: bulkUpdateTask,
    create: createTask,
    delete: deleteTask,
    get: getTask,
    getAssignees: getTaskAssignees,
    getCompletionSummary: getTaskCompletionSummary,
    getLoggedHours: getTaskLoggedHours,
    getSubTasks,
    list: listTasks,
    restore: restoreTask,
    unassign: unassignTask,
    update: updateTask,
  };

  readonly projects = {
    addMember: addProjectMember,
    archive: archiveProject,
    create: createProject,
    delete: deleteProject,
    get: getProject,
    list: listProjects,
    listMembers: listProjectMembers,
    removeMember: removeProjectMember,
    restore: restoreProject,
    update: updateProject,
    updateMember: updateProjectMember,
  };

  readonly comments = {
    create: createComment,
    delete: deleteComment,
    get: getComment,
    listByTask: listCommentsByTask,
    listReplies: listCommentReplies,
    update: updateComment,
  };

  readonly links = {
    create: createTaskLink,
    delete: deleteTaskLink,
    getCriticalPath: getTaskLinkCriticalPath,
    getDependencyGraph: getTaskLinkDependencyGraph,
    listByTask: listLinksByTask,
    topologicalSort: topologicalSortTasks,
  };

  readonly timeEntries = {
    create: createTimeEntry,
    delete: deleteTimeEntry,
    get: getTimeEntry,
    getTotalDuration: getTimeEntryTotalDuration,
    list: listTimeEntries,
    update: updateTimeEntry,
  };

  readonly statuses = {
    create: createStatus,
    createTransition,
    delete: deleteStatus,
    deleteTransition,
    get: getStatus,
    getGlobal: getGlobalStatuses,
    list: listStatuses,
    listTransitions,
    update: updateStatus,
    validateTransition,
  };

  readonly taskTypes = {
    createLabel,
    createTaskType,
    deleteLabel,
    deleteTaskType,
    listLabels,
    listTaskTypes,
    updateLabel,
    updateTaskType,
  };

  readonly reminders = {
    create: createReminder,
    createDueDateReminders,
    createOverdueReminder,
    delete: deleteReminder,
    get: getReminder,
    getPending: getPendingReminders,
    list: listReminders,
    processPending: processPendingReminders,
    update: updateReminder,
  };

  readonly automations = {
    create: createAutomationRule,
    delete: deleteAutomationRule,
    evaluateRules: evaluateAutomationRules,
    get: getAutomationRule,
    getActiveRules: getActiveAutomationRules,
    listByProject: listAutomationRulesByProject,
    update: updateAutomationRule,
  };

  readonly collaboration = {
    addAttachment,
    addWatcher,
    deleteAttachment,
    getActivityLog,
    listAttachments,
    listAttachmentsByComment,
    listWatchers,
    removeWatcher,
  };

  readonly views = {
    create: createSavedView,
    delete: deleteSavedView,
    get: getSavedView,
    getDefault: getDefaultSavedView,
    listByOwner: listSavedViewsByOwner,
    listByProject: listSavedViewsByProject,
    listShared: listSharedSavedViews,
    update: updateSavedView,
  };
}
