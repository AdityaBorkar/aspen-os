import type {
  DatabaseUnit,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

import * as dbSchema from "./db-schema";
import { REMINDER_EVENTS, TASK_EVENTS } from "./event-map";
import { NotificationBridge } from "./services/notification-bridge";
import { ReportService } from "./services/report-service";
import { AutomationWorkflow } from "./workflows/automation";
import { CollaborationWorkflow } from "./workflows/collaboration";
import { CommentWorkflow } from "./workflows/comment";
import { LinkWorkflow } from "./workflows/link";
import { ProjectWorkflow } from "./workflows/project";
import { ReminderWorkflow } from "./workflows/reminder";
import { StatusWorkflow } from "./workflows/status";
import { TaskWorkflow } from "./workflows/task";
import { TaskTypeWorkflow } from "./workflows/task-type";
import { TimeEntryWorkflow } from "./workflows/time-entry";
import { ViewWorkflow } from "./workflows/view";

export type {
  ReminderEventMap,
  TaskDomainEventMap,
  TaskEventMap,
} from "./event-map";
export { REMINDER_EVENTS, TASK_EVENTS } from "./event-map";
export type {
  AssignTaskInput,
  BulkUpdateTaskInput,
  CreateAttachmentInput,
  CreateAutomationRuleInput,
  CreateCommentInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateProjectMemberInput,
  CreateReminderInput,
  CreateSavedViewInput,
  CreateStatusInput,
  CreateStatusTransitionInput,
  CreateTaskInput,
  CreateTaskLinkInput,
  CreateTaskTypeInput,
  CreateTimeEntryInput,
  CreateWatcherInput,
  CriticalPathResult,
  ProjectFilters,
  ReminderFilters,
  TaskCompletionSummary,
  TaskDependencyNode,
  TaskFilters,
  TaskLinkInfo,
  TimeEntryFilters,
  UpdateAutomationRuleInput,
  UpdateCommentInput,
  UpdateLabelInput,
  UpdateProjectInput,
  UpdateProjectMemberInput,
  UpdateReminderInput,
  UpdateSavedViewInput,
  UpdateStatusInput,
  UpdateTaskInput,
  UpdateTaskTypeInput,
  UpdateTimeEntryInput,
} from "./types";
export { dbSchema };

export interface TaskModuleConfig {
  enableNotifications?: boolean;
}

export class TaskModule {
  static create(config?: TaskModuleConfig): TaskModule {
    return new TaskModule(config ?? {});
  }

  readonly db_schema = dbSchema;
  readonly $name = "tasks";
  readonly $dependencies: readonly string[] = [];

  #automation: AutomationWorkflow | null = null;
  #collaboration: CollaborationWorkflow | null = null;
  #comments: CommentWorkflow | null = null;
  #links: LinkWorkflow | null = null;
  #notificationBridge: NotificationBridge | null = null;
  #projects: ProjectWorkflow | null = null;
  #reminders: ReminderWorkflow | null = null;
  #reports: ReportService | null = null;
  #statuses: StatusWorkflow | null = null;
  #taskTypes: TaskTypeWorkflow | null = null;
  #tasks: TaskWorkflow | null = null;
  #timeEntries: TimeEntryWorkflow | null = null;
  #views: ViewWorkflow | null = null;

  constructor(private config: TaskModuleConfig) {}

  get automation(): AutomationWorkflow {
    if (!this.#automation) throw notInitialized();
    return this.#automation;
  }

  get collaboration(): CollaborationWorkflow {
    if (!this.#collaboration) throw notInitialized();
    return this.#collaboration;
  }

  get comments(): CommentWorkflow {
    if (!this.#comments) throw notInitialized();
    return this.#comments;
  }

  get links(): LinkWorkflow {
    if (!this.#links) throw notInitialized();
    return this.#links;
  }

  get projects(): ProjectWorkflow {
    if (!this.#projects) throw notInitialized();
    return this.#projects;
  }

  get reminders(): ReminderWorkflow {
    if (!this.#reminders) throw notInitialized();
    return this.#reminders;
  }

  get reports(): ReportService {
    if (!this.#reports) throw notInitialized();
    return this.#reports;
  }

  get statuses(): StatusWorkflow {
    if (!this.#statuses) throw notInitialized();
    return this.#statuses;
  }

  get taskTypes(): TaskTypeWorkflow {
    if (!this.#taskTypes) throw notInitialized();
    return this.#taskTypes;
  }

  get tasks(): TaskWorkflow {
    if (!this.#tasks) throw notInitialized();
    return this.#tasks;
  }

  get timeEntries(): TimeEntryWorkflow {
    if (!this.#timeEntries) throw notInitialized();
    return this.#timeEntries;
  }

  get views(): ViewWorkflow {
    if (!this.#views) throw notInitialized();
    return this.#views;
  }

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    const db = units.db.db;

    if (this.config.enableNotifications) {
      this.#notificationBridge = new NotificationBridge(units.pubsub);
    }

    this.#automation = new AutomationWorkflow(db);
    this.#collaboration = new CollaborationWorkflow(db);
    this.#comments = new CommentWorkflow(db);
    this.#links = new LinkWorkflow(db);
    this.#projects = new ProjectWorkflow(db);
    this.#reminders = new ReminderWorkflow(db, this.#notificationBridge);
    this.#reports = new ReportService(db);
    this.#statuses = new StatusWorkflow(db);
    this.#taskTypes = new TaskTypeWorkflow(db);
    this.#tasks = new TaskWorkflow(db);
    this.#timeEntries = new TimeEntryWorkflow(db);
    this.#views = new ViewWorkflow(db);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl: {} },
      db: { schemas: dbSchema.taskTables },
      events: { reminder: REMINDER_EVENTS, task: TASK_EVENTS },
    };
  }

  async $cleanup(): Promise<void> {
    this.#automation = null;
    this.#collaboration = null;
    this.#comments = null;
    this.#links = null;
    this.#notificationBridge = null;
    this.#projects = null;
    this.#reminders = null;
    this.#reports = null;
    this.#statuses = null;
    this.#taskTypes = null;
    this.#tasks = null;
    this.#timeEntries = null;
    this.#views = null;
  }
}

function notInitialized(): Error {
  return new Error(
    "Tasks module not initialized. Call $initialize() after Platform.create().",
  );
}
