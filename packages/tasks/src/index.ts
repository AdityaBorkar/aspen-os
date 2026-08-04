import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub-events";
import type { NotificationBridgeDeps } from "./services/notification-bridge";
import {
  getCumulativeFlow,
  getTaskSummary,
  getTimeReport,
  getWorkloadReport,
  type ReportServiceDeps,
} from "./services/report-service";
import { acl } from "./utils/acl";
import {
  type AutomationServiceDeps,
  createAutomationRule,
  deleteAutomationRule,
  evaluateAutomationRules,
  getActiveAutomationRules,
  getAutomationRuleById,
  listAutomationRulesByProject,
  updateAutomationRule,
} from "./workflows/automation";
import {
  addAttachment,
  addWatcher,
  type CollaborationServiceDeps,
  deleteAttachment,
  getActivityLog,
  listAttachments,
  listAttachmentsByComment,
  listWatchers,
  removeWatcher,
} from "./workflows/collaboration";
import {
  type CommentServiceDeps,
  createComment,
  deleteComment,
  getCommentById,
  listCommentReplies,
  listCommentsByTask,
  updateComment,
} from "./workflows/comment";
import {
  createTaskLink,
  deleteTaskLink,
  getLinkCriticalPath,
  getLinkDependencyGraph,
  type LinkServiceDeps,
  listLinksByTask,
  topologicalSortTasks,
} from "./workflows/link";
import {
  addProjectMember,
  archiveProject,
  createProject,
  deleteProject,
  getProjectById,
  listProjectMembers,
  listProjects,
  type ProjectServiceDeps,
  removeProjectMember,
  restoreProject,
  updateProject,
  updateProjectMember,
} from "./workflows/project";
import {
  createDueDateReminders,
  createOverdueReminder,
  createReminder,
  deleteReminder,
  getPendingReminders,
  getReminderById,
  listReminders,
  processPendingReminders,
  type ReminderServiceDeps,
  updateReminder,
} from "./workflows/reminder";
import {
  createStatus,
  createTransition,
  deleteStatus,
  deleteTransition,
  getGlobalStatuses,
  getStatusById,
  listStatuses,
  listTransitions,
  type StatusServiceDeps,
  updateStatus,
  validateTransition,
} from "./workflows/status";
import {
  archiveTask,
  assignTask,
  bulkUpdateTask,
  createTask,
  deleteTask,
  getAssignees,
  getCompletionSummary,
  getLoggedHours,
  getSubTasks,
  getTaskById,
  listTasks,
  restoreTask,
  type TasksServiceDeps,
  unassignTask,
  updateTask,
} from "./workflows/task";
import {
  createLabel,
  createTaskType,
  deleteLabel,
  deleteTaskType,
  listLabels,
  listTaskTypes,
  type TaskTypeServiceDeps,
  updateLabel,
  updateTaskType,
} from "./workflows/task-type";
import {
  createTimeEntry,
  deleteTimeEntry,
  getTimeEntryById,
  getTotalDuration,
  listTimeEntries,
  type TimeEntryServiceDeps,
  updateTimeEntry,
} from "./workflows/time-entry";
import {
  createSavedView,
  deleteSavedView,
  getDefaultSavedView,
  getSavedViewById,
  listSavedViewsByOwner,
  listSavedViewsByProject,
  listSharedSavedViews,
  updateSavedView,
  type ViewServiceDeps,
} from "./workflows/view";

export * from "./types";

type DrizzleDB = NodePgDatabase;

export interface TasksDeps {
  db: DrizzleDB;
  notificationBridge: NotificationBridgeDeps | null;
  pubsub: PubSubUnit | null;
}

export interface TaskModuleConfig {
  enableNotifications?: boolean;
}

export class Tasks implements Module {
  static create(config?: TaskModuleConfig): Tasks {
    return new Tasks(config ?? {});
  }

  readonly $name = "tasks";
  readonly $dependencies: readonly string[] = [];
  readonly $config: TaskModuleConfig;

  #db: DatabaseUnit | null = null;
  #notificationBridge: NotificationBridgeDeps | null = null;

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

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
    if (this.$config.enableNotifications) {
      this.#notificationBridge = { pubsub: units.pubsub };
    }
  }

  $prepareRuntime() {}

  $cleanup() {}

  get _() {
    if (!this.#db) throw new Error("Tasks not initialized");
    const deps: TasksDeps = {
      db: this.#db.db,
      notificationBridge: this.#notificationBridge,
      pubsub: null,
    };
    return {
      automation: {
        create: (input: Parameters<typeof createAutomationRule>[0]) =>
          createAutomationRule(input, deps),
        delete: (id: Parameters<typeof deleteAutomationRule>[0]) =>
          deleteAutomationRule(id, deps),
        evaluateRules: (
          context: Parameters<typeof evaluateAutomationRules>[0],
        ) => evaluateAutomationRules(context, deps),
        get: (id: Parameters<typeof getAutomationRuleById>[0]) =>
          getAutomationRuleById(id, deps),
        getActiveRules: (
          projectId: Parameters<typeof getActiveAutomationRules>[0],
          trigger: Parameters<typeof getActiveAutomationRules>[1],
        ) => getActiveAutomationRules(projectId, trigger, deps),
        listByProject: (
          projectId: Parameters<typeof listAutomationRulesByProject>[0],
        ) => listAutomationRulesByProject(projectId, deps),
        update: (
          id: Parameters<typeof updateAutomationRule>[0],
          patch: Parameters<typeof updateAutomationRule>[1],
        ) => updateAutomationRule(id, patch, deps),
      },
      collaboration: {
        addAttachment: (input: Parameters<typeof addAttachment>[0]) =>
          addAttachment(input, deps),
        addWatcher: (input: Parameters<typeof addWatcher>[0]) =>
          addWatcher(input, deps),
        deleteAttachment: (id: Parameters<typeof deleteAttachment>[0]) =>
          deleteAttachment(id, deps),
        getActivityLog: (
          taskId: Parameters<typeof getActivityLog>[0],
          action?: Parameters<typeof getActivityLog>[1],
        ) => getActivityLog(taskId, action, deps),
        listAttachments: (taskId: Parameters<typeof listAttachments>[0]) =>
          listAttachments(taskId, deps),
        listAttachmentsByComment: (
          commentId: Parameters<typeof listAttachmentsByComment>[0],
        ) => listAttachmentsByComment(commentId, deps),
        listWatchers: (taskId: Parameters<typeof listWatchers>[0]) =>
          listWatchers(taskId, deps),
        removeWatcher: (
          taskId: Parameters<typeof removeWatcher>[0],
          userId: Parameters<typeof removeWatcher>[1],
        ) => removeWatcher(taskId, userId, deps),
      },
      comments: {
        create: (input: Parameters<typeof createComment>[0]) =>
          createComment(input, deps),
        delete: (id: Parameters<typeof deleteComment>[0]) =>
          deleteComment(id, deps),
        get: (id: Parameters<typeof getCommentById>[0]) =>
          getCommentById(id, deps),
        listByTask: (taskId: Parameters<typeof listCommentsByTask>[0]) =>
          listCommentsByTask(taskId, deps),
        listReplies: (parentId: Parameters<typeof listCommentReplies>[0]) =>
          listCommentReplies(parentId, deps),
        update: (
          id: Parameters<typeof updateComment>[0],
          patch: Parameters<typeof updateComment>[1],
        ) => updateComment(id, patch, deps),
      },
      links: {
        create: (input: Parameters<typeof createTaskLink>[0]) =>
          createTaskLink(input, deps),
        delete: (
          sourceId: Parameters<typeof deleteTaskLink>[0],
          targetId: Parameters<typeof deleteTaskLink>[1],
        ) => deleteTaskLink(sourceId, targetId, deps),
        getCriticalPath: (
          projectId: Parameters<typeof getLinkCriticalPath>[0],
        ) => getLinkCriticalPath(projectId, deps),
        getDependencyGraph: (
          taskIds: Parameters<typeof getLinkDependencyGraph>[0],
        ) => getLinkDependencyGraph(taskIds, deps),
        listByTask: (taskId: Parameters<typeof listLinksByTask>[0]) =>
          listLinksByTask(taskId, deps),
        topologicalSort: (
          taskIds: Parameters<typeof topologicalSortTasks>[0],
        ) => topologicalSortTasks(taskIds, deps),
      },
      projects: {
        addMember: (input: Parameters<typeof addProjectMember>[0]) =>
          addProjectMember(input, deps),
        archive: (id: Parameters<typeof archiveProject>[0]) =>
          archiveProject(id, deps),
        create: (input: Parameters<typeof createProject>[0]) =>
          createProject(input, deps),
        delete: (id: Parameters<typeof deleteProject>[0]) =>
          deleteProject(id, deps),
        get: (id: Parameters<typeof getProjectById>[0]) =>
          getProjectById(id, deps),
        list: (filters: Parameters<typeof listProjects>[0]) =>
          listProjects(filters, deps),
        listMembers: (projectId: Parameters<typeof listProjectMembers>[0]) =>
          listProjectMembers(projectId, deps),
        removeMember: (
          projectId: Parameters<typeof removeProjectMember>[0],
          userId: Parameters<typeof removeProjectMember>[1],
        ) => removeProjectMember(projectId, userId, deps),
        restore: (id: Parameters<typeof restoreProject>[0]) =>
          restoreProject(id, deps),
        update: (
          id: Parameters<typeof updateProject>[0],
          patch: Parameters<typeof updateProject>[1],
        ) => updateProject(id, patch, deps),
        updateMember: (
          projectId: Parameters<typeof updateProjectMember>[0],
          userId: Parameters<typeof updateProjectMember>[1],
          patch: Parameters<typeof updateProjectMember>[2],
        ) => updateProjectMember(projectId, userId, patch, deps),
      },
      reminders: {
        create: (input: Parameters<typeof createReminder>[0]) =>
          createReminder(input, deps),
        createDueDateReminders: (
          taskId: Parameters<typeof createDueDateReminders>[0],
          dueDate: Parameters<typeof createDueDateReminders>[1],
          userId: Parameters<typeof createDueDateReminders>[2],
        ) => createDueDateReminders(taskId, dueDate, userId, deps),
        createOverdueReminder: (
          taskId: Parameters<typeof createOverdueReminder>[0],
          userId: Parameters<typeof createOverdueReminder>[1],
        ) => createOverdueReminder(taskId, userId, deps),
        delete: (id: Parameters<typeof deleteReminder>[0]) =>
          deleteReminder(id, deps),
        get: (id: Parameters<typeof getReminderById>[0]) =>
          getReminderById(id, deps),
        getPending: () => getPendingReminders(deps),
        list: (filters: Parameters<typeof listReminders>[0]) =>
          listReminders(filters, deps),
        processPending: () => processPendingReminders(deps),
        update: (
          id: Parameters<typeof updateReminder>[0],
          patch: Parameters<typeof updateReminder>[1],
        ) => updateReminder(id, patch, deps),
      },
      reports: {
        getCumulativeFlow: (
          projectId: Parameters<typeof getCumulativeFlow>[0],
          dateFrom: Parameters<typeof getCumulativeFlow>[1],
          dateTo: Parameters<typeof getCumulativeFlow>[2],
        ) => getCumulativeFlow(projectId, dateFrom, dateTo, deps),
        getTaskSummary: (projectId: Parameters<typeof getTaskSummary>[0]) =>
          getTaskSummary(projectId, deps),
        getTimeReport: (
          projectId: Parameters<typeof getTimeReport>[0],
          dateFrom?: Parameters<typeof getTimeReport>[2],
          dateTo?: Parameters<typeof getTimeReport>[3],
        ) => getTimeReport(projectId, deps, dateFrom, dateTo),
        getWorkloadReport: (
          projectId: Parameters<typeof getWorkloadReport>[0],
        ) => getWorkloadReport(projectId, deps),
      },
      statuses: {
        create: (input: Parameters<typeof createStatus>[0]) =>
          createStatus(input, deps),
        createTransition: (input: Parameters<typeof createTransition>[0]) =>
          createTransition(input, deps),
        delete: (id: Parameters<typeof deleteStatus>[0]) =>
          deleteStatus(id, deps),
        deleteTransition: (id: Parameters<typeof deleteTransition>[0]) =>
          deleteTransition(id, deps),
        get: (id: Parameters<typeof getStatusById>[0]) =>
          getStatusById(id, deps),
        getGlobal: () => getGlobalStatuses(deps),
        list: (projectId: Parameters<typeof listStatuses>[0]) =>
          listStatuses(projectId, deps),
        listTransitions: (projectId: Parameters<typeof listTransitions>[0]) =>
          listTransitions(projectId, deps),
        update: (
          id: Parameters<typeof updateStatus>[0],
          patch: Parameters<typeof updateStatus>[1],
        ) => updateStatus(id, patch, deps),
        validateTransition: (
          fromStatusId: Parameters<typeof validateTransition>[0],
          toStatusId: Parameters<typeof validateTransition>[1],
          projectId: Parameters<typeof validateTransition>[2],
        ) => validateTransition(fromStatusId, toStatusId, projectId, deps),
      },
      tasks: {
        archive: (id: Parameters<typeof archiveTask>[0]) =>
          archiveTask(id, deps),
        assign: (input: Parameters<typeof assignTask>[0]) =>
          assignTask(input, deps),
        bulkUpdate: (input: Parameters<typeof bulkUpdateTask>[0]) =>
          bulkUpdateTask(input, deps),
        create: (input: Parameters<typeof createTask>[0]) =>
          createTask(input, deps),
        delete: (id: Parameters<typeof deleteTask>[0]) => deleteTask(id, deps),
        get: (id: Parameters<typeof getTaskById>[0]) => getTaskById(id, deps),
        getAssignees: (taskId: Parameters<typeof getAssignees>[0]) =>
          getAssignees(taskId, deps),
        getCompletionSummary: (
          parentId: Parameters<typeof getCompletionSummary>[0],
        ) => getCompletionSummary(parentId, deps),
        getLoggedHours: (taskId: Parameters<typeof getLoggedHours>[0]) =>
          getLoggedHours(taskId, deps),
        getSubTasks: (parentId: Parameters<typeof getSubTasks>[0]) =>
          getSubTasks(parentId, deps),
        list: (filters: Parameters<typeof listTasks>[0]) =>
          listTasks(filters, deps),
        restore: (id: Parameters<typeof restoreTask>[0]) =>
          restoreTask(id, deps),
        unassign: (
          taskId: Parameters<typeof unassignTask>[0],
          userId: Parameters<typeof unassignTask>[1],
        ) => unassignTask(taskId, userId, deps),
        update: (
          id: Parameters<typeof updateTask>[0],
          patch: Parameters<typeof updateTask>[1],
        ) => updateTask(id, patch, deps),
      },
      taskTypes: {
        createLabel: (input: Parameters<typeof createLabel>[0]) =>
          createLabel(input, deps),
        createTaskType: (input: Parameters<typeof createTaskType>[0]) =>
          createTaskType(input, deps),
        deleteLabel: (id: Parameters<typeof deleteLabel>[0]) =>
          deleteLabel(id, deps),
        deleteTaskType: (id: Parameters<typeof deleteTaskType>[0]) =>
          deleteTaskType(id, deps),
        listLabels: (projectId: Parameters<typeof listLabels>[0]) =>
          listLabels(projectId, deps),
        listTaskTypes: (projectId: Parameters<typeof listTaskTypes>[0]) =>
          listTaskTypes(projectId, deps),
        updateLabel: (
          id: Parameters<typeof updateLabel>[0],
          patch: Parameters<typeof updateLabel>[1],
        ) => updateLabel(id, patch, deps),
        updateTaskType: (
          id: Parameters<typeof updateTaskType>[0],
          patch: Parameters<typeof updateTaskType>[1],
        ) => updateTaskType(id, patch, deps),
      },
      timeEntries: {
        create: (input: Parameters<typeof createTimeEntry>[0]) =>
          createTimeEntry(input, deps),
        delete: (id: Parameters<typeof deleteTimeEntry>[0]) =>
          deleteTimeEntry(id, deps),
        get: (id: Parameters<typeof getTimeEntryById>[0]) =>
          getTimeEntryById(id, deps),
        getTotalDuration: (
          taskId: Parameters<typeof getTotalDuration>[0],
          billableOnly?: Parameters<typeof getTotalDuration>[1],
        ) => getTotalDuration(taskId, billableOnly, deps),
        list: (filters: Parameters<typeof listTimeEntries>[0]) =>
          listTimeEntries(filters, deps),
        update: (
          id: Parameters<typeof updateTimeEntry>[0],
          patch: Parameters<typeof updateTimeEntry>[1],
        ) => updateTimeEntry(id, patch, deps),
      },
      views: {
        create: (input: Parameters<typeof createSavedView>[0]) =>
          createSavedView(input, deps),
        delete: (id: Parameters<typeof deleteSavedView>[0]) =>
          deleteSavedView(id, deps),
        get: (id: Parameters<typeof getSavedViewById>[0]) =>
          getSavedViewById(id, deps),
        getDefault: (
          ownerId: Parameters<typeof getDefaultSavedView>[0],
          projectId?: Parameters<typeof getDefaultSavedView>[1],
        ) => getDefaultSavedView(ownerId, projectId, deps),
        listByOwner: (ownerId: Parameters<typeof listSavedViewsByOwner>[0]) =>
          listSavedViewsByOwner(ownerId, deps),
        listByProject: (
          projectId: Parameters<typeof listSavedViewsByProject>[0],
        ) => listSavedViewsByProject(projectId, deps),
        listShared: (projectId: Parameters<typeof listSharedSavedViews>[0]) =>
          listSharedSavedViews(projectId, deps),
        update: (
          id: Parameters<typeof updateSavedView>[0],
          patch: Parameters<typeof updateSavedView>[1],
        ) => updateSavedView(id, patch, deps),
      },
    };
  }
}

export type {
  AutomationServiceDeps,
  CollaborationServiceDeps,
  CommentServiceDeps,
  LinkServiceDeps,
  ProjectServiceDeps,
  ReminderServiceDeps,
  ReportServiceDeps,
  StatusServiceDeps,
  TasksServiceDeps,
  TaskTypeServiceDeps,
  TimeEntryServiceDeps,
  ViewServiceDeps,
};
