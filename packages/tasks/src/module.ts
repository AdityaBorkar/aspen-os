import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { getActiveAutomationRules } from "#/workflows/automation/active/get";
import { listAutomationRulesByProject } from "#/workflows/automation/by-project/list";
import { createAutomationRule } from "#/workflows/automation/create";
import { deleteAutomationRule } from "#/workflows/automation/delete";
import { evaluateAutomationRules } from "#/workflows/automation/evaluate";
import { getAutomationRule } from "#/workflows/automation/get";
import { updateAutomationRule } from "#/workflows/automation/update";
import { getActivityLog } from "#/workflows/collaboration/activity-log/get";
import { addAttachment } from "#/workflows/collaboration/attachment/add";
import { deleteAttachment } from "#/workflows/collaboration/attachment/delete";
import { listAttachmentsByComment } from "#/workflows/collaboration/attachments/by-comment/list";
import { listAttachments } from "#/workflows/collaboration/attachments/list";
import { addWatcher } from "#/workflows/collaboration/watcher/add";
import { removeWatcher } from "#/workflows/collaboration/watcher/remove";
import { listWatchers } from "#/workflows/collaboration/watchers/list";
import { listCommentsByTask } from "#/workflows/comment/by-task/list";
import { createComment } from "#/workflows/comment/create";
import { deleteComment } from "#/workflows/comment/delete";
import { getComment } from "#/workflows/comment/get";
import { listCommentReplies } from "#/workflows/comment/replies/list";
import { updateComment } from "#/workflows/comment/update";
import { listLinksByTask } from "#/workflows/link/by-task/list";
import { createTaskLink } from "#/workflows/link/create";
import { getTaskLinkCriticalPath } from "#/workflows/link/critical-path";
import { deleteTaskLink } from "#/workflows/link/delete";
import { getTaskLinkDependencyGraph } from "#/workflows/link/dependency-graph";
import { topologicalSortTasks } from "#/workflows/link/topological-sort";
import { archiveProject } from "#/workflows/project/archive";
import { createProject } from "#/workflows/project/create";
import { deleteProject } from "#/workflows/project/delete";
import { getProject } from "#/workflows/project/get";
import { listProjects } from "#/workflows/project/list";
import { addProjectMember } from "#/workflows/project/member/add";
import { removeProjectMember } from "#/workflows/project/member/remove";
import { updateProjectMember } from "#/workflows/project/member/update";
import { listProjectMembers } from "#/workflows/project/members/list";
import { restoreProject } from "#/workflows/project/restore";
import { updateProject } from "#/workflows/project/update";
import { createStatus } from "#/workflows/status/create";
import { deleteStatus } from "#/workflows/status/delete";
import { getStatus } from "#/workflows/status/get";
import { getGlobalStatuses } from "#/workflows/status/global/list";
import { listStatuses } from "#/workflows/status/list";
import { createTransition } from "#/workflows/status/transition/create";
import { deleteTransition } from "#/workflows/status/transition/delete";
import { validateTransition } from "#/workflows/status/transition/validate";
import { listTransitions } from "#/workflows/status/transitions/list";
import { updateStatus } from "#/workflows/status/update";
import { createTaskType } from "#/workflows/task-type/create";
import { deleteTaskType } from "#/workflows/task-type/delete";
import { createLabel } from "#/workflows/task-type/label/create";
import { deleteLabel } from "#/workflows/task-type/label/delete";
import { updateLabel } from "#/workflows/task-type/label/update";
import { listLabels } from "#/workflows/task-type/labels/list";
import { listTaskTypes } from "#/workflows/task-type/list";
import { updateTaskType } from "#/workflows/task-type/update";
import { archiveTask } from "#/workflows/task/archive";
import { assignTask } from "#/workflows/task/assign";
import { getTaskAssignees } from "#/workflows/task/assignee/list";
import { bulkUpdateTask } from "#/workflows/task/bulk-update";
import { getTaskCompletionSummary } from "#/workflows/task/completion-summary";
import { createTask } from "#/workflows/task/create";
import { deleteTask } from "#/workflows/task/delete";
import { getTask } from "#/workflows/task/get";
import { listTasks } from "#/workflows/task/list";
import { getTaskLoggedHours } from "#/workflows/task/logged-hours";
import { restoreTask } from "#/workflows/task/restore";
import { getSubTasks } from "#/workflows/task/sub-task/list";
import { unassignTask } from "#/workflows/task/unassign";
import { updateTask } from "#/workflows/task/update";
import { createTimeEntry } from "#/workflows/time-entry/create";
import { deleteTimeEntry } from "#/workflows/time-entry/delete";
import { getTimeEntry } from "#/workflows/time-entry/get";
import { listTimeEntries } from "#/workflows/time-entry/list";
import { getTimeEntryTotalDuration } from "#/workflows/time-entry/total-duration";
import { updateTimeEntry } from "#/workflows/time-entry/update";
import { listSavedViewsByOwner } from "#/workflows/view/by-owner/list";
import { listSavedViewsByProject } from "#/workflows/view/by-project/list";
import { createSavedView } from "#/workflows/view/create";
import { getDefaultSavedView } from "#/workflows/view/default/get";
import { deleteSavedView } from "#/workflows/view/delete";
import { getSavedView } from "#/workflows/view/get";
import { listSharedSavedViews } from "#/workflows/view/shared/list";
import { updateSavedView } from "#/workflows/view/update";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

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
