import type {
  DatabaseUnit,
  Module,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/platform/server";

import { acl } from "./auth-acl";
import { schemas } from "./db-schemas";
import { events } from "./pubsub-events";
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

export * from "./types";

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
  #notificationBridge: NotificationBridge | null = null;

  constructor(config: TaskModuleConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { schemas },
      events,
    };
  }

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
    if (this.$config.enableNotifications) {
      this.#notificationBridge = new NotificationBridge(units.pubsub);
    }
  }

  $prepareRuntime() {}

  $cleanup() {}

  get tasks() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new TaskWorkflow(this.#db.db);
  }

  get projects() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new ProjectWorkflow(this.#db.db);
  }

  get statuses() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new StatusWorkflow(this.#db.db);
  }

  get taskTypes() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new TaskTypeWorkflow(this.#db.db);
  }

  get comments() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new CommentWorkflow(this.#db.db);
  }

  get links() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new LinkWorkflow(this.#db.db);
  }

  get timeEntries() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new TimeEntryWorkflow(this.#db.db);
  }

  get reminders() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new ReminderWorkflow(this.#db.db, this.#notificationBridge);
  }

  get collaboration() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new CollaborationWorkflow(this.#db.db);
  }

  get automation() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new AutomationWorkflow(this.#db.db);
  }

  get views() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new ViewWorkflow(this.#db.db);
  }

  get reports() {
    if (!this.#db) throw new Error("Tasks not initialized");
    return new ReportService(this.#db.db);
  }
}
